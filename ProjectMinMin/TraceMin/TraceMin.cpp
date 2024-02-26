#include <eosio/eosio.hpp>
#include <eosio/print.hpp>
#include <string>

using namespace eosio;
using namespace std;

class [[eosio::contract("TraceMin")]] TraceMin : public contract {
public:
    using contract::contract;

    struct [[eosio::table]] memberStruct {
        name name;
        string type;
        string certification;
        vector<string> receivers;
        uint32_t entries;

        uint64_t primary_key() const { return name.value; }
    };
    typedef multi_index<"members"_n, memberStruct> members_table;


    struct [[eosio::table]] ownershipStruct {
        uint64_t id;
        name member;
        string state;
        uint32_t number;
        string participant;
        string timestamp;
        string destination;

        uint64_t primary_key() const { return id; }
        uint64_t by_member() const { return member.value; }
    };
    typedef multi_index<"ownership"_n, ownershipStruct,
    indexed_by<"bymember"_n, const_mem_fun<ownershipStruct, uint64_t, &ownershipStruct::by_member>>
    > ownership_table;



    [[eosio::action]]
    void setmember(name name, string type, string certification, vector<string> receiversSig) {
        require_auth(get_self());
        members_table members_instance(get_self(), get_self().value);

        auto member_itr = members_instance.find(name.value);
        if (member_itr == members_instance.end()) {
            members_instance.emplace(get_self(), [&](auto& row) {
                row.name = name;
                row.type = type;
                row.receivers = receiversSig;
                row.certification = certification;
                row.entries = 0;

            });
        } else {
            members_instance.modify(member_itr, get_self(), [&](auto& row) {
                row.type = type;
                row.certification = certification;
            });
        }
    }


    [[eosio::action]]
    void addproductnb(name member, string state, string participant, string destination, uint32_t number, string timestamp) {
        require_auth(get_self());
        members_table members_instance(_self, _self.value);
        auto member_itr = members_instance.find(member.value);
        check(member_itr != members_instance.end(), "Member does not exist");

        // Obtenir la table des produits
        ownership_table ownership_instance(get_self(), get_self().value);
        auto index = ownership_instance.get_index<"bymember"_n>();
        auto itr = index.find(member.value);
        
        while (itr != index.end() && itr->member == member && itr->state == state && itr->participant == participant && itr->destination == destination) {
            
            index.modify(itr, _self, [&](auto& row) {
                row.number += number;
            });
            return;
        }

        // Ajouter un nouveau produit à la table des produits
        ownership_instance.emplace(get_self(), [&](auto& row) {
            row.id = ownership_instance.available_primary_key();
            row.member = member;
            row.state = state;
            row.participant = participant; 
            row.number = number;
            row.timestamp = timestamp;
            row.destination = destination; 
        });
    }

    // Action pour enregistrer une mesure
    [[eosio::action]]
    void addentrynb(name name) {
        require_auth(get_self());
        members_table members_instance(_self, _self.value);
        auto member_itr = members_instance.find(name.value);
        check(member_itr != members_instance.end(), "Member does not exist");

        while (member_itr != members_instance.end()) {
            members_instance.modify(member_itr, get_self(), [&](auto& member) {
            member.entries += 1;
            });
            return;
        }
    }  


    [[eosio::action]]
    void clear() {
        require_auth(get_self());

        ownership_table ownership_instance(get_self(), get_self().value);
        auto ownership_itr = ownership_instance.begin();
        while (ownership_itr != ownership_instance.end()) {
            ownership_itr = ownership_instance.erase(ownership_itr);
        }

        members_table members_instance(get_self(), get_self().value);
        auto members_itr = members_instance.begin();
        while (members_itr != members_instance.end()) {
            members_itr = members_instance.erase(members_itr);
        }

    }
};
EOSIO_DISPATCH(TraceMin, (addproductnb)(addentrynb)(setmember)(clear))