#include <eosio/eosio.hpp>
#include <eosio/print.hpp>
#include <string>
#include <vector>
#include <optional>
#include <algorithm>

using namespace eosio;
using namespace std;

class [[eosio::contract("taissmax")]] taissmax : public contract {
public:
    using contract::contract;

    // Structures

    struct Ownership {
        uint64_t ownerId;
        string state; // rejected, accepted, delivered or changed Logtek
        uint64_t ownershipTimestamp;
        string participant;
        string destination;
    };

    struct Measurement {
        bool temperature = true;
        bool humidity = true;
        bool oxygen = true;
        bool ammonia = true;
        vector<uint64_t> entryIds;
    };

    struct [[eosio::table]] productStruct {
        uint64_t id;
        string productRFID;
        vector<uint64_t> logtekIds;
        vector<Ownership> ownershipHistory; 
        Measurement conditions;

        uint64_t primary_key() const { return id; }
    };
    typedef multi_index<"products"_n, productStruct>  products_table;

    struct [[eosio::table]] memberStruct {
        uint64_t member_id;
        string name;
        string type;
        vector<string> receivers;
        string certification;

        uint64_t primary_key() const { return member_id; }
    };
    typedef multi_index<"members"_n, memberStruct> members_table;


    struct [[eosio::table]] logtekStruct {
        uint64_t id;
        string logtekSignature;
        vector<string> sensors;
        vector<string> productRFID; 
        uint64_t owner;
        string fishingDate;
        float weight; 

        uint64_t primary_key() const { return id; }
    };
    typedef multi_index<"logteks"_n, logtekStruct> logteks_table;
    

    struct [[eosio::table]] entryStruct {
        uint64_t id;
        string transmitterSig;
        string receiverSig;
        uint64_t timestamp;
        float temperature;
        float humidity;
        float ammoniaConcentration;
        float dissolvedOxygen;

        uint64_t primary_key() const { return id; }
    };
    typedef multi_index<"entries"_n, entryStruct> entries_table;

    // Fonctions internes

    auto find_logtek_by_productRFID(const string& productRFID, logteks_table& logteks) {
        auto logtek_itr = logteks.begin();
        while (logtek_itr != logteks.end()) {
            if (std::find(logtek_itr->productRFID.begin(), logtek_itr->productRFID.end(), productRFID) != logtek_itr->productRFID.end()) {
                return logtek_itr;
            }
            ++logtek_itr;
        }
        return logteks.end();
    }

    optional<uint64_t> check_receiver(const string& receiverSig, members_table& members) {
        auto member_itr = members.begin();
        while (member_itr != members.end()) {
            if (find(member_itr->receivers.begin(), member_itr->receivers.end(), receiverSig) != member_itr->receivers.end()) {
                return member_itr->member_id;
            }
            ++member_itr;
        }
        return {};
    }

    auto find_logtek_by_signature(logteks_table& logteks, const string& signature) {
        auto itr = logteks.begin();
        while (itr != logteks.end()) {
            if (itr->logtekSignature == signature) {
                return itr;
            }
            ++itr;
        }
        return itr;
    }

    auto find_product_by_rfid(products_table& products, const string& rfid) {
        auto itr = products.begin();
        while (itr != products.end()) {
            if (itr->productRFID == rfid) {
                return itr;
            }
            ++itr;
        }
        return itr;
    }


    [[eosio::action]]
    void initlogtek(string receiverSignature, string logtekSignature, vector<string> sensors, string fishingDate, float weight) {
        require_auth(get_self());
        logteks_table logteks_instance(get_self(), get_self().value);        
        members_table members_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");
        auto member_itr = members_instance.find(memberId.value());
        if ((member_itr->type != "fisher") && (member_itr->type != "ET")) { 
            eosio::check(false, "Unauthorized action for this member type");
        } 
        auto logtek_itr = logteks_instance.find(logteks_instance.available_primary_key());
        if (logtek_itr == logteks_instance.end()) {
            logteks_instance.emplace(get_self(), [&](auto& row) {
                row.id = logteks_instance.available_primary_key();
                row.logtekSignature = logtekSignature;
                row.sensors = sensors;
                row.owner = memberId.value();
                row.fishingDate = fishingDate;
                row.weight= weight;
            });
        } else {
            logteks_instance.modify(logtek_itr, get_self(), [&](auto& row) {
                row.logtekSignature = logtekSignature;
                row.sensors = sensors;
                row.owner = memberId.value();
                row.fishingDate = fishingDate;
                row.weight= weight;
            });
        }
    }

// pêcheur ajoute et associe un produit à un logtek
    [[eosio::action]]
    void addproduct(string receiverSignature, string logtekSignature, string productRFID, uint64_t ownershipTimestamp) {
        require_auth(get_self());
        logteks_table logteks_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);
        members_table members_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");
        auto member_itr = members_instance.find(memberId.value());
        if (member_itr->type != "fisher") {
            eosio::check(false, "Unauthorized action for this member type");
        }       
        // Vérifier si la logtek existe dans la table logteks
        auto logtek_itr = find_logtek_by_signature(logteks_instance, logtekSignature);
        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        // Ajouter le produit à la table products_table
        products_instance.emplace(get_self(), [&](auto& row) {
            row.id = products_instance.available_primary_key();
            row.productRFID = productRFID;
            row.logtekIds.push_back(logtek_itr->id);
            row.ownershipHistory.push_back(Ownership{memberId.value(), "Accepted", ownershipTimestamp});
            row.conditions.temperature = true; 
            row.conditions.humidity = true; 
            row.conditions.oxygen = true; 
            row.conditions.ammonia = true; 
        });

        logteks_instance.modify(logtek_itr, get_self(), [&](auto& row) {
            row.productRFID.push_back(productRFID);
        });

    }


    [[eosio::action]]
    void associate(string receiverSignature, string logtekSignature, string productRFID, uint64_t timestamp) {
        require_auth(get_self());

        logteks_table logteks_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);
        members_table members_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");
        auto member_itr = members_instance.find(memberId.value());
        eosio::check(member_itr->type == "ET", "Unauthorized action for this member type");

        auto logtek_itr = find_logtek_by_signature(logteks_instance, logtekSignature);
        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        auto product_itr = find_product_by_rfid(products_instance, productRFID);
        eosio::check(product_itr != products_instance.end(), "Product not found");

        // Ajouter le produit à la table products_table
        products_instance.modify(product_itr, get_self(), [&](auto& row) {
            row.logtekIds.push_back(logtek_itr->id);
            row.ownershipHistory.emplace_back(Ownership{memberId.value(), "Changed Logtek", timestamp});
        });

        logteks_instance.modify(logtek_itr, get_self(), [&](auto& row) {
            row.productRFID.push_back(productRFID);
        });

        // Trouver et supprimer le productRFID de l'ancien logtek
        for (auto& oldLogtekId : product_itr->logtekIds) {
            if (oldLogtekId != logtek_itr->id) {
                auto oldLogtek_itr = logteks_instance.find(oldLogtekId);
                if (oldLogtek_itr != logteks_instance.end()) {
                    auto& oldLogtek = *oldLogtek_itr;
                    
                    // Créez un nouveau vecteur pour stocker les productRFID sans celui que vous souhaitez supprimer
                    vector<string> newProductRFIDs;
                    for (const string& productRFID : oldLogtek.productRFID) {
                        if (productRFID != product_itr->productRFID) {
                            newProductRFIDs.push_back(productRFID);
                        }
                    }

                    // Mettez à jour le champ productRFID du vieux logtek dans la table logteks
                    logteks_instance.modify(oldLogtek_itr, get_self(), [&](auto& row) {
                        row.productRFID = newProductRFIDs;
                    });
                }
            }
        }

    }


    [[eosio::action]]
    void setmember(string name, string type, vector<string> receiversSig, string certification) {
        require_auth(get_self());
        members_table members_instance(get_self(), get_self().value);

        auto member_itr = members_instance.find(members_instance.available_primary_key());
        if (member_itr == members_instance.end()) {
            members_instance.emplace(get_self(), [&](auto& row) {
                row.member_id = members_instance.available_primary_key();
                row.name = name;
                row.type = type;
                row.receivers = receiversSig;
                row.certification = certification;
            });
        } else {
            members_instance.modify(member_itr, get_self(), [&](auto& row) {
                row.name = name;
                row.type = type;
                row.receivers = receiversSig;
                row.certification = certification;
            });
        }
    }

    [[eosio::action]]
    void setentry(string transmitterSig, string receiverSignature, uint64_t timestamp, float temperature, float humidity, float ammoniaConcentration, float dissolvedOxygen) {
        require_auth(get_self());

        logteks_table logteks_instance(get_self(), get_self().value);
        entries_table entries_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);

        auto logtek_itr = logteks_instance.begin();
        while (logtek_itr != logteks_instance.end()) {
            if (find(logtek_itr->sensors.begin(), logtek_itr->sensors.end(), transmitterSig) != logtek_itr->sensors.end()) {
                break;
            }
            ++logtek_itr;
        }

        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        entries_instance.emplace(get_self(), [&](auto& row) {
            row.id = entries_instance.available_primary_key();
            row.transmitterSig = transmitterSig;
            row.receiverSig = receiverSignature;
            row.timestamp = timestamp;
            row.temperature = temperature;
            row.humidity = humidity;
            row.ammoniaConcentration = ammoniaConcentration;
            row.dissolvedOxygen = dissolvedOxygen;
        });

        auto entry_itr = entries_instance.find(entries_instance.available_primary_key() - 1);
        // eosio::check(entry_itr != entries_instance.end(), "No entry found");

        // Effectuer les opérations nécessaires pour mettre à jour les conditions
        bool temperatureSatisfied = (entry_itr->temperature >= 7.0 && entry_itr->temperature <= 15.0);
        bool ammoniaConcentrationSatisfied = (entry_itr->ammoniaConcentration < 2.0);
        bool humiditySatisfied = (entry_itr->humidity >= 60.0 && entry_itr->humidity <= 90.0);
        bool dissolvedOxygenSatisfied = (entry_itr->dissolvedOxygen > 5.0);

        // Mettre à jour les produits correspondants dans la table products_table
        for (const auto& productRFID : logtek_itr->productRFID) {
            auto product_itr = find_product_by_rfid(products_instance, productRFID);
            eosio::check(product_itr != products_instance.end(), "Product not found");

            products_instance.modify(product_itr, get_self(), [&](auto& product) {
                if (product.conditions.temperature == 1) {
                    product.conditions.temperature = temperatureSatisfied;
                }

                if (product.conditions.ammonia == 1) {
                    product.conditions.ammonia = ammoniaConcentrationSatisfied;
                }

                if (product.conditions.humidity == 1) {
                    product.conditions.humidity = humiditySatisfied;
                }

                if (product.conditions.oxygen == 1) {
                    product.conditions.oxygen = dissolvedOxygenSatisfied;
                }

                if (!temperatureSatisfied || !ammoniaConcentrationSatisfied || !humiditySatisfied || !dissolvedOxygenSatisfied) {
                    product.conditions.entryIds.push_back(entry_itr->id);
                }
            });
        }
    }


    [[eosio::action]]
    void exitscan(string receiverSignature, string logtekSignature, const vector<string>& scannedProductRFIDs, uint64_t timestamp, string participant, string destination) {
        require_auth(get_self());

        members_table members_instance(get_self(), get_self().value);
        logteks_table logteks_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");

        auto logtek_itr = find_logtek_by_signature(logteks_instance, logtekSignature);
        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        const auto& logtek = *logtek_itr;

        eosio::check(logtek.productRFID == scannedProductRFIDs, "Product mismatch");

        for (const auto& productRFID : scannedProductRFIDs) {
            auto product_itr = find_product_by_rfid(products_instance, productRFID);
            eosio::check(product_itr != products_instance.end(), "Product not found");

            auto& product = *product_itr;
            const Ownership& previousOwnership = product.ownershipHistory.back();
            eosio::check(previousOwnership.ownerId == memberId.value() && ((previousOwnership.state == "Accepted") || (previousOwnership.state == "Changed Logtek")), "Product is not Accepted by this owner");

            products_instance.modify(product_itr, get_self(), [&](auto& row) {
                row.ownershipHistory.emplace_back(Ownership{memberId.value(), "Delivered",timestamp, participant, destination});
            });
        }
    }

    [[eosio::action]]
    void enterscan(string receiverSignature, string logtekSignature, const vector<string>& scannedProductRFIDs, uint64_t timestamp, string participant, string destination) {
        require_auth(get_self());

        members_table members_instance(get_self(), get_self().value);
        logteks_table logteks_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");

        auto logtek_itr = find_logtek_by_signature(logteks_instance, logtekSignature);
        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        const auto& logtek = *logtek_itr;

        eosio::check(logtek.productRFID == scannedProductRFIDs, "Product mismatch");

        for (const auto& productRFID : scannedProductRFIDs) {
            auto product_itr = find_product_by_rfid(products_instance, productRFID);
            eosio::check(product_itr != products_instance.end(), "Product not found");

            auto& product = *product_itr;
            const Ownership& previousOwnership = product.ownershipHistory.back();
            eosio::check(previousOwnership.state == "Delivered", "Product is not yet delivered");

            products_instance.modify(product_itr, get_self(), [&](auto& row) {
                row.ownershipHistory.emplace_back(Ownership{memberId.value(), "Accepted", timestamp, participant, destination});
            });
        }
    }


    [[eosio::action]]
    void rejectscan(string receiverSignature, string logtekSignature, const vector<string>& scannedProductRFIDs, uint64_t timestamp, string participant) {
        require_auth(get_self());

        members_table members_instance(get_self(), get_self().value);
        logteks_table logteks_instance(get_self(), get_self().value);
        products_table products_instance(get_self(), get_self().value);

        auto memberId = check_receiver(receiverSignature, members_instance);
        eosio::check(memberId.has_value(), "Receiver not found");

        auto logtek_itr = find_logtek_by_signature(logteks_instance, logtekSignature);
        eosio::check(logtek_itr != logteks_instance.end(), "Logtek not found");

        const auto& logtek = *logtek_itr;

        eosio::check(logtek.productRFID == scannedProductRFIDs, "Product mismatch");

        for (const auto& productRFID : scannedProductRFIDs) {
            auto product_itr = find_product_by_rfid(products_instance, productRFID);
            eosio::check(product_itr != products_instance.end(), "Product not found");

            auto& product = *product_itr;
            const Ownership& previousOwnership = product.ownershipHistory.back();
            eosio::check((previousOwnership.state == "Delivered") || ((previousOwnership.state == "Accepted") && previousOwnership.ownerId == memberId.value()), "Product is not yet delivered");

            products_instance.modify(product_itr, get_self(), [&](auto& row) {
                row.ownershipHistory.emplace_back(Ownership{memberId.value(), "Rejected", timestamp, participant});
            });
        }
    }


    // Action pour effacer toutes les données des tableaux
    [[eosio::action]]
    void clear() {
        require_auth(get_self());

        products_table products_instance(get_self(), get_self().value);
        auto products_itr = products_instance.begin();
        while (products_itr != products_instance.end()) {
            products_itr = products_instance.erase(products_itr);
        }

        logteks_table logteks_instance(get_self(), get_self().value);
        auto logteks_itr = logteks_instance.begin();
        while (logteks_itr != logteks_instance.end()) {
            logteks_itr = logteks_instance.erase(logteks_itr);
        }

        members_table members_instance(get_self(), get_self().value);
        auto members_itr = members_instance.begin();
        while (members_itr != members_instance.end()) {
            members_itr = members_instance.erase(members_itr);
        }

        entries_table entries_instance(get_self(), get_self().value);
        auto entries_itr = entries_instance.begin();
        while (entries_itr != entries_instance.end()) {
            entries_itr = entries_instance.erase(entries_itr);
        }
    }
};

EOSIO_DISPATCH(taissmax, (initlogtek)(addproduct)(associate)(setmember)(setentry)(enterscan)(exitscan)(rejectscan)(clear))