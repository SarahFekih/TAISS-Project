const axios = require('axios'); 
const fs = require('fs');
const dgram = require('dgram');
const Raddec = require('raddec');
const simulateSensor= require('./SimulateSensorData');

const apiUrl = 'http://localhost:3000/min';

const csvData = fs.readFileSync('firstscenario.csv', 'utf-8' );

const lines = csvData.split('\n');
let p = lines[1].split(',');
let previousTimestamp = parseInt(p[0]); // Initial previousTimestamp
let client = dgram.createSocket('udp4');

processLine(1); // Start processing from the second line (index 1)

function processLine(lineIndex) {
  if (lineIndex >= lines.length) {
    // All lines have been processed
    return;
  }

  const line = lines[lineIndex];
  const parts = line.split(',');

  const timestamp = parseInt(parts[0]);
  const action = parts[1];
  const data = {
    name: getValue(parts[2]),
    type: getValue(parts[3]),
    receiversSig: getValue(parts[4]),
    receiverSignature: getValue(parts[5]),
    logtekSignature: getValue(parts[6]),
    sensors: getValue(parts[7]),
    fishingDate: getValue(parts[8]),
    weight: getValue(parts[9]),
    productRFID: getValue(parts[10]),
    ownershipTimestamp: getValue(parts[11]),
    transmitterSig: getValue(parts[12]),
    temperature: getValue(parts[13]),
    humidity: getValue(parts[14]),
    ammoniaConcentration: getValue(parts[15]),
    dissolvedOxygen: getValue(parts[16]),
    scannedProductRFIDs: getValue(parts[17]),
    certification: getValue(parts[18]),
    participant: getValue(parts[19]),
    destination: getValue(parts[20])
  };

  const timeDifference = timestamp - previousTimestamp;
  //console.log(timeDifference);

  setTimeout(() => {
    simulateEvent(timestamp, action, data);
    previousTimestamp = timestamp;
    processLine(lineIndex + 1); // Process the next line
  }, timeDifference * 1000);
}

function getValue(value) {
  return value !== '' ? value : undefined;
}

function simulateEvent(timestamp, action, data) {
  const validData = Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));
  console.log('Timestamp:', timestamp);
  console.log('Action:', action);
  console.log('Data:', validData);
  // console.log('---');

  if (action=='setentry') {
    simulateSensor.transmitSimulatedAmmoniaConcentration("bada55beac04", "112233445566", timestamp, parseFloat(validData.ammoniaConcentration));
    simulateSensor.transmitSimulatedDissolvedOxygen(validData.transmitterSig, validData.receiverSignature, timestamp, parseFloat(validData.dissolvedOxygen), parseFloat(validData.temperature));
    // const jsonResult = JSON.parse(fs.readFileSync('jsonResult.json', 'utf-8'));
    // console.log('jsonResult reçu dans le deuxième script :', jsonResult); 
  } 
  else if (action=='setmember') {
    const chaineNettoyee = validData.receiversSig.slice(1, -1);
    const liste = chaineNettoyee.split(';');

    // console.log(liste);
    let requestData=  {
      name: validData.name,
      type: validData.type,
      receiversSig: liste,
      certification: validData.certification
    };
    // console.log(requestData);
    axios.post(apiUrl + '/setmember', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }
  else if (action=='initlogtek') {
    const chaineNettoyee = validData.sensors.slice(1, -1);
    const liste = chaineNettoyee.split(';');
    
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      sensors : liste, 
      fishingDate: validData.fishingDate, 
      weight: validData.weight
    };
    // console.log(requestData);
    axios.post(apiUrl + '/initlogtek', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);  
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }

  else if (action=='addproduct') {
    
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      productRFID : validData.productRFID, 
      ownershipTimestamp : validData.ownershipTimestamp
    };
    // console.log(requestData);
    axios.post(apiUrl + '/addproduct', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }
  else if (action=='associate') {
    
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      productRFID : validData.productRFID, 
      timestamp : validData.ownershipTimestamp
    };
    // console.log(requestData);
    axios.post(apiUrl + '/associate', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
      console.log('---');
    });
  }

  else if (action=='exitscan') {
    const chaineNettoyee = validData.scannedProductRFIDs.slice(1, -1);
    const liste = chaineNettoyee.split(';');
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      scannedProductRFIDs :liste , 
      participant : validData.participant, 
      timestamp : timestamp,
      destination : validData.destination 
    };
    // console.log(requestData);
    axios.post(apiUrl + '/exitscan', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }

  else if (action=='enterscan') {
    const chaineNettoyee = validData.scannedProductRFIDs.slice(1, -1);
    const liste = chaineNettoyee.split(';');
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      scannedProductRFIDs :liste , 
      participant : validData.participant, 
      timestamp : timestamp,
      destination : validData.destination 
    };
    // console.log(requestData);
    axios.post(apiUrl + '/enterscan', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }

  // rejectscan
  else if (action=='rejectscan') {
    const chaineNettoyee = validData.scannedProductRFIDs.slice(1, -1);
    const liste = chaineNettoyee.split(';');
    let requestData=  {
      receiverSignature : validData.receiverSignature, 
      logtekSignature : validData.logtekSignature, 
      scannedProductRFIDs :liste , 
      participant : validData.participant, 
      timestamp : timestamp,
      destination : validData.destination 
    };
    // console.log(requestData);
    axios.post(apiUrl + '/rejectscan', requestData)
    .then(response => {
      console.log('Réponse de l\'API :', response.data);
      console.log('---');
    })
    .catch(error => {
      console.error('Erreur lors de l\'appel de l\'API :', error);
    });
  }

}
