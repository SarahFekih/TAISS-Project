const dgram = require('dgram');
const Raddec = require('raddec');
// const FlexSimData = require ('./csvparse');

let client = dgram.createSocket('udp4');

// // Periodically send simulated UDP raddecs
// setInterval(() => {
//   transmitSimulatedAmmoniaConcentration("bada55beac04", "112233445566", "123444485", 1.5);
// }, 2000);

// setInterval(() => {
//   transmitSimulatedDissolvedOxygen('12345678', '23453323', '123444485', 16.5, 23.4);
// }, 2000);


// Create and transmit a simulated ammonia concentration packet
function transmitSimulatedAmmoniaConcentration(transmitterId, receiverId, timestamp, ammonia) {
  let ammoniaHex = (Math.round(ammonia * 50) + 16).toString(16) + 'b0';
  let raddec = new Raddec({
    transmitterId: transmitterId,
    transmitterIdType: 3,
    rssiSignature: [
      { receiverId: receiverId, receiverIdType: 2, rssi: -60 }
    ],
    timestamp: timestamp,
    packets: [ '000f04acbe55daba0201060516cf2b' + ammoniaHex ]
  });
  let message = Buffer.from(raddec.encodeAsHexString({ includePackets: true}),
                                                     'hex');
  // console.log(message);
  client.send(message, 50001, 'localhost', (err) => {
    if(err) { console.log(err); }
  });
}

// Create and transmit a simulated dissolved oxygen packet
function transmitSimulatedDissolvedOxygen(transmitterId, receiverId, timestamp, oxygen, temperature) {

  let sensorHex = '7' + (Math.round(oxygen * 50)).toString(16) +  (Math.round(temperature) + 16).toString(16) + '20';

  let raddec = new Raddec({
    transmitterId: transmitterId,
    transmitterIdType: 7,
    rssiSignature: [
      { receiverId: receiverId, receiverIdType: 7, rssi: -60 }
    ],
    timestamp: timestamp,
    packets: [ 'd2' + sensorHex + '0414006980' ]
  });
  let message = Buffer.from(raddec.encodeAsHexString({ includePackets: true}),
                                                     'hex');
  // console.log(message);
  client.send(message, 50001, 'localhost', (err) => {
    if(err) { console.log(err); }
  });
}

module.exports = {
  transmitSimulatedAmmoniaConcentration,
  transmitSimulatedDissolvedOxygen
};