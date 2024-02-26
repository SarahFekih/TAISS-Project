// contract.js

const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const config = require('./config');
const fetch = require('node-fetch');


// Configuration de la signature
const signatureProvider = new JsSignatureProvider([config.contractPrivateKey]);

// Configuration de l'API EOSIO
const rpc = new JsonRpc(config.httpEndpoint, { fetch });
const api = new Api({ rpc, signatureProvider });

let totalcpu=0;
let totalnet=0;

async function sendTransaction(contractFunction, transactionData) {
  try {
    const result = await api.transact({
      actions: [
        {
          account: config.contractAccount,
          name: contractFunction,
          authorization: [
            {
              actor: config.contractAccount,
              permission: 'active',
            },
          ],
          data: transactionData,
        },
      ],
    }, {
      blocksBehind: 3,
      expireSeconds: 30,
    });

    // console.log('Transaction ID:', result.transaction_id);
    console.log( result);
    calculatePreformance(result.processed.receipt.cpu_usage_us,  result.processed.receipt.net_usage_words);

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function addProduct(receiverSignature, logtekSignature, productRFID, ownershipTimestamp) {
  const transactionData = {
    receiverSignature: receiverSignature,
    logtekSignature: logtekSignature,
    productRFID: productRFID,
    ownershipTimestamp: ownershipTimestamp,
  };
  return await sendTransaction('addproduct', transactionData);
}

async function setMember(name, type, receiversSig, certification) {
  const transactionData = {
    name : name,
    type : type,
    receiversSig : receiversSig,
    certification : certification,
  };
  return await sendTransaction('setmember', transactionData);
}

async function initLogtek(receiverSignature, logtekSignature, sensors, fishingDate, weight) {
  const transactionData = {
    receiverSignature,
    logtekSignature,
    sensors,
    fishingDate,
    weight,
  };
  return await sendTransaction('initlogtek', transactionData);
}

async function associate(receiverSignature, logtekSignature, productRFID, timestamp) {
  const transactionData = { receiverSignature, logtekSignature, productRFID, timestamp };
  return await sendTransaction('associate', transactionData);
}

async function enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination ) {
  const transactionData = { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination };
  return await sendTransaction('enterscan', transactionData);
}

async function exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination) {
  const transactionData = { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination };
  return await sendTransaction('exitscan', transactionData);
}

async function rejectscan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant) {
  const transactionData = { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant };
  return await sendTransaction('rejectscan', transactionData);
}

async function setentry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen){
  const transactionData = { transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen};
  return await sendTransaction('setentry', transactionData);
}

async function calculatePreformance(cpu, net) {
  totalcpu += cpu;
  totalnet += net;

  console.log('Total CPU consomation  :'+ totalcpu);
  console.log('Total NET consomation  :'+ totalnet);
}  

async function getEntries(productRFID) {
  try {
    const result = await rpc.get_table_rows({
      json: true,
      code: config.contractAccount,
      scope: config.contractAccount,
      table: 'entries',
      lower_bound: productRFID, 
      upper_bound: productRFID, 
    });

    return result.rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = {
  addProduct,
  getEntries,
  initLogtek,
  setentry,
  associate,
  setMember,
  enterScan,
  exitScan,
  rejectscan,
};
