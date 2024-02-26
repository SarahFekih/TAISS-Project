const advlib = require('advlib');
const fs = require('fs');
const Barnowl = require('barnowl');
const dgram = require('dgram');
const Raddec = require('raddec');
const axios = require('axios'); 

let jsonResult = null;

// // Variables pour accumuler les raddecs
let ammoniaConcentration = null;
let dissolvedOxygen = null;
let temperature = null;

// Ces spécifient comment advlib-esp doit traiter la charge utile de chaque appareil
const ENOCEAN_DEVICE_PROFILES = {
    "04140069/7": { eepType: "D2-14-51" }
};

// Processors pour les paquets Bluetooth Low Energy
const BLE_PROCESSORS = [
    {
        processor: require('advlib-ble'),
        libraries: [require('advlib-ble-services'), require('advlib-ble-manufacturers')],
        options: { ignoreProtocolOverhead: true }
    }
];

// Processors pour les paquets EnOcean
const ENOCEAN_PROCESSORS = [
    {
        processor: require('advlib-esp'),
        libraries: [require('advlib-eep-vld')],
        options: {
            ignoreProtocolOverhead: true,
            deviceProfiles: ENOCEAN_DEVICE_PROFILES,
            isERP1PayloadOnly: true
        }
    }
];

// Interpréteur pour les identifiants InteroperaBLE
const INTERPRETERS = [require('advlib-interoperable')];

let client = dgram.createSocket('udp4');
let barnowl = new Barnowl({ enableMixing: true, mixingDelayMilliseconds: 1000 });

// Gérer le décodage radio
barnowl.on('raddec', (raddec) => {
    // console.log('1');
    if (Array.isArray(raddec.packets) && (raddec.packets.length > 0)) {
        let isBluetoothLowEnergy = ((raddec.transmitterIdType === 2) || (raddec.transmitterIdType === 3));
        let isEnOcean = (raddec.transmitterIdType === 7);

        if (isBluetoothLowEnergy) {
            // Raddec Bluetooth Low Energy (ammoniac)
            let packet = raddec.packets[0];
            let processedPacket = advlib.process(packet, BLE_PROCESSORS, INTERPRETERS);
            ammoniaConcentration = processedPacket.ammoniaConcentration; // Remplacer 'ammoniaConcentration' par la clé appropriée dans le raddec
        } else if (isEnOcean) {
            // Raddec EnOcean (oxygène et température)
            let packet = raddec.packets[0];
            let processedPacket = advlib.process(packet, ENOCEAN_PROCESSORS, INTERPRETERS);
            dissolvedOxygen = processedPacket.dissolvedOxygen; // Remplacer 'oxygenSaturation' par la clé appropriée dans le raddec
            temperature = processedPacket.temperature; // Remplacer 'temperature' par la clé appropriée dans le raddec
        }

        if (ammoniaConcentration !== null && dissolvedOxygen !== null && temperature !== null) {
             // trois valeurs reçues
            let humidityRan = Number((Math.random() * (92 - 60) + 60).toFixed(1));
            // let temperatureRan = Number((Math.random() * (17 - 7) + 7).toFixed(1));
            // let ammoniaConcentrationRan = Number((Math.random() * 2).toFixed(1));
            // let dissolvedOxygenRan = Number((Math.random() * (20 - 5) + 5).toFixed(1));
            
            // Créer le JSON final
            jsonResult = {
                "transmitterSignature": raddec.transmitterId + '/' + raddec.transmitterIdType,
                "receiverSignature": raddec.rssiSignature[0].receiverId + '/' + raddec.rssiSignature[0].receiverIdType,
                "timestamp": raddec.timestamp,
                "temperature": temperature,
                "humidity": humidityRan,
                "ammoniaConcentration": ammoniaConcentration,
                "dissolvedOxygen": dissolvedOxygen
            };
            // jsonResult = {
            //     "transmitterSignature": raddec.transmitterId + '/' + raddec.transmitterIdType,
            //     "receiverSignature": raddec.rssiSignature[0].receiverId + '/' + raddec.rssiSignature[0].receiverIdType,
            //     "timestamp": raddec.timestamp,
            //     "temperature": temperatureRan,
            //     "humidity": humidityRan,
            //     "ammoniaConcentration": ammoniaConcentrationRan,
            //     "dissolvedOxygen": dissolvedOxygenRan
            // };

            // Réinitialiser les valeurs
            ammoniaConcentration = null;
            dissolvedOxygen = null;
            temperature = null;

            // fs.writeFileSync('jsonResult.json', JSON.stringify(jsonResult));
            // console.log('MY JSON RESULT : \n'+ jsonResult);
            // Appelle à l'API
            let requestData=  {
                transmitterSig : jsonResult.transmitterSignature, 
                receiverSignature : jsonResult.receiverSignature, 
                timestamp : jsonResult.timestamp, 
                temperature: jsonResult.temperature, 
                humidity: humidityRan, 
                ammoniaConcentration : jsonResult.ammoniaConcentration, 
                dissolvedOxygen: jsonResult.dissolvedOxygen
              };
              console.log(requestData);
              axios.post('http://localhost:3000/api/setentry', requestData)
              .then(response => {
                console.log('Réponse de l\'API :', response.data);
                console.log('---');

              })
              .catch(error => {
                console.error('Erreur lors de l\'appel de l\'API :', error);
              });

        }
    }
});

// Écouter les raddecs UDP
barnowl.addListener(Barnowl, {}, Barnowl.UdpListener, {});