#!/bin/bash

# Démarrer mongod en arrière-plan
nohup mongod --dbpath /data/db --unixSocketPrefix ~/mongodb-sockets &

# Attendre un peu avant de lancer le prochain processus
sleep 2

# Supprimer toutes les lignes de la table dans la base de données MongoDB
nohup mongo taissbf --eval  "db.dropDatabase();"

# Démarrer nodeos en arrière-plan
nohup nodeos -e -p eosio --config-dir ~/eosio-data/config --data-dir ~/eosio-data/data --disable-replay-opts --trace-no-abis &

# Attendre un peu avant de lancer les autres processus
sleep 2


# Exécuter les autres commandes
node ./FlexSimPareto/callPareto.js &
sleep 2
node ./index.js & 
sleep 2
node FlexSimPareto/csvparse.js &
sleep 2

# Afficher un message indiquant la fin de l'exécution
echo "Toutes les commandes ont été exécutées avec succès."
