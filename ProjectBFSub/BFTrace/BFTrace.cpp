#include <eosio/eosio.hpp>
#include <string>

using namespace eosio;
using namespace std;

class [[eosio::contract("BFTrace")]] BFTrace : public contract {
  public:
    using contract::contract;

    struct [[eosio::table]] memberStruct {
      name name;
      string type;
      string certification;
      vector<string> receivers;
      uint32_t entTotal;

      uint64_t primary_key() const { return name.value; }  
  };
  typedef multi_index<"members"_n, memberStruct> members_table;
    
    struct [[eosio::table]] bloomfilter_struct {
      uint64_t id; 
      name member;
      string state;
      string timestamp;
      string participant;
      string destination; 
      uint64_t num_hashes;
      uint64_t max_elements;
      uint64_t num_elements;
      uint64_t size_bits;
      std::vector<uint64_t> bloom_filter;
      uint64_t primary_key() const { return id; }
      uint64_t by_member() const { return member.value; }
    };

    typedef multi_index<"bloomfilter"_n, bloomfilter_struct,
    indexed_by<"bymember"_n, const_mem_fun<bloomfilter_struct, uint64_t, &bloomfilter_struct::by_member>>
    > bf_table;

    struct [[eosio::table]] similarity {
      uint64_t id;
      double coefficient;
      name sender;
      name receiver;
      string destination;

      uint64_t primary_key() const { return id; }
    };

    typedef eosio::multi_index<"simresult"_n, similarity> simresult_table;

    [[eosio::action]]
    void setmember(name name, string type, string certification, vector<string> receivers) {
        require_auth(get_self());
        members_table members_instance(get_self(), get_self().value);

        auto member_itr = members_instance.find(name.value);
        if (member_itr == members_instance.end()) {
            members_instance.emplace(get_self(), [&](auto& row) {
                row.name = name;
                row.type = type;
                row.receivers = receivers;
                row.certification = certification;
                row.entTotal = 0;
            });
        } else {
            members_instance.modify(member_itr, get_self(), [&](auto& row) {
                row.type = type;
                row.receivers = receivers;
                row.certification = certification;
            });
        }
    }

  [[eosio::action]]
  void insert(name member, string state, string participant, string destination, const std::vector<std::pair<uint64_t, uint64_t>>& positions, uint64_t num, string timestamp) {
    require_auth(_self);
    members_table members_instance(_self, _self.value);
    auto member_itr = members_instance.find(member.value);
    check(member_itr != members_instance.end(), "Member does not exist");


    bf_table bftable(_self, _self.value);

    auto index = bftable.get_index<"bymember"_n>();
    auto itr = index.find(member.value);
    while (itr != index.end() && itr->member == member && itr->state == state && itr->participant == participant && itr->destination == destination) {
        index.modify(itr, _self, [&](auto& row) {
            for (const auto& pos_pair : positions) {
                uint64_t idx = pos_pair.first;
                uint64_t bit = pos_pair.second;
                check(idx < row.bloom_filter.size(), "Position is out of range");
                row.bloom_filter[idx] |= (1ULL << bit);
            }
            row.num_elements += num;
        });

        return;
    }

    uint64_t num_hashes = 7;
    uint64_t max_elements = 5000; //15000
    uint64_t size_bits = 47965; //143895

    uint64_t size_uint64 = (size_bits + 63) / 64; // 1051 //2249

    std::vector<uint64_t> bf(size_uint64, 0);

    bftable.emplace(_self, [&](auto& row) {
        row.id = bftable.available_primary_key();
        row.member = member;
        row.state = state;
        row.participant = participant;
        row.destination = destination;
        row.timestamp = timestamp;
        row.num_hashes = num_hashes;
        row.max_elements = max_elements;
        row.num_elements = num;
        row.size_bits = size_bits;
        row.bloom_filter = bf;

        for (const auto& pos_pair : positions) {
            uint64_t idx = pos_pair.first;
            uint64_t bit = pos_pair.second;
            check(idx < row.bloom_filter.size(), "Position is out of range");
            row.bloom_filter[idx] |= (1ULL << bit);
        }
    });
}


  [[eosio::action]]
    void setentry(string transmitterSig, string receiverSignature, uint64_t timestamp, float temperature, float humidity, float ammoniaConcentration, float dissolvedOxygen) {
        require_auth(_self);
      members_table members(get_self(), get_self().value);

      auto memberItr = members.begin();
      while (memberItr != members.end()) {
          for (const string& receiver : memberItr->receivers) {
              if (receiver == receiverSignature) {
                  members.modify(memberItr, get_self(), [&](auto& member) {
                      member.entTotal += 1;
                  });
                  return;
              }
          }
          memberItr++;
      }

      check(false, "receiverSignature introuvable parmi les membres");
        
    }

    [[eosio::action]]
    void simcoef(const name sender, const name receiver, string destination) {

        bf_table bftable(_self, _self.value);
        auto index = bftable.get_index<"bymember"_n>();

        auto itr_filter1 = index.find(sender.value);
        while (itr_filter1 != index.end() && (itr_filter1->member != sender || itr_filter1->state != "Delivered" || itr_filter1->destination != destination)) {
            ++itr_filter1;
        }

        if (itr_filter1 == index.end()) {
            print("Filtre Bloom de l'émetteur non trouvé avec les conditions spécifiées.");
            return;
        }

        auto itr_filter2 = index.find(receiver.value);
        while (itr_filter2 != index.end() && (itr_filter2->member != receiver || itr_filter2->state != "Received" || itr_filter1->destination != destination)) {
            ++itr_filter2;
        }

        if (itr_filter2 == index.end()) {
            print("Filtre Bloom du récepteur non trouvé avec les conditions spécifiées.");
            return;
        }

        const auto& filter1 = itr_filter1->bloom_filter;
        const auto& filter2 = itr_filter2->bloom_filter;

        uint64_t h = 0;
        uint64_t a = 0;
        uint64_t b = 0;

        for (uint64_t i = 0; i < filter1.size(); i++) {
            h += __builtin_popcountll(filter1[i] & filter2[i]);
            a += __builtin_popcountll(filter1[i]);
            b += __builtin_popcountll(filter2[i]);
        }

        double coefficient = 0.0;
        if (a + b > 0) {
            coefficient = static_cast<double>(2 * h) / static_cast<double>(a + b);
        }

        print("Coefficient de dé: ", coefficient);
        
        simresult_table sim_results(get_self(), get_self().value);
        sim_results.emplace(get_self(), [&](auto& row) {
            row.id = sim_results.available_primary_key();
            row.coefficient = coefficient;
            row.sender = sender;
            row.receiver = receiver;
            row.destination = destination;
        });
    }

    [[eosio::action]]
    void exists(name member, string state, string participant, string destination, const std::vector<uint64_t>& positions) {
        members_table members_instance(_self, _self.value);
        auto member_itr = members_instance.find(member.value);
        check(member_itr != members_instance.end(), "Member does not exist");


        bf_table bftable(_self, _self.value);

        auto index = bftable.get_index<"bymember"_n>();
        auto itr = index.find(member.value);

        while (itr != index.end() && itr->member == member && itr->state == state && itr->participant == participant && itr->destination == destination) {

            for (auto pos : positions) {
                uint64_t idx = pos / 64;
                uint64_t bit = pos % 64;
                check(idx < itr->bloom_filter.size(), "Position is out of range");
                check((itr->bloom_filter[idx] & (1ULL << bit)) != 0, "Element does not exist in Bloom filter");
            }
            return;
        }
    }

    [[eosio::action]]
    void clear() {
        require_auth(get_self());

        bf_table bf_instance(get_self(), get_self().value);
        auto bf_itr = bf_instance.begin();
        while (bf_itr != bf_instance.end()) {
            bf_itr = bf_instance.erase(bf_itr);
        }

        members_table members_instance(get_self(), get_self().value);
        auto members_itr = members_instance.begin();
        while (members_itr != members_instance.end()) {
            members_itr = members_instance.erase(members_itr);
        }

        simresult_table simresult_instance(get_self(), get_self().value);
        auto simresult_itr = simresult_instance.begin();
        while (simresult_itr != simresult_instance.end()) {
            simresult_itr = simresult_instance.erase(simresult_itr);
        }

    }

};
EOSIO_DISPATCH(BFTrace, (setmember)(simcoef)(insert)(setentry)(exists)(clear))