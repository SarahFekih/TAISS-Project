const { TransactionBuilder, Api, RpcError, JsonRpc} = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const { TextEncoder, TextDecoder } = require('util');
const config = require('./config');
const mongoUtils = require('./models'); 
const hashage = require('./hashage');
const fetch = require('node-fetch');

const signatureProvider = new JsSignatureProvider([config.contractPrivateKey]);
const rpc = new JsonRpc(config.httpEndpoint, { fetch });
const eos = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
  chainId: config.chainId,
});
const seeds = [1, 2, 3, 4, 5, 6, 7];
const filterSize = 47965;
let totalcpu=0;
let totalnet=0;

async function setMember (name, type, certification, receivers){
  const transactionData = {
    name : name, 
    type : type, 
    certification : certification,
    receivers : receivers
  };

  const actions = [
  {
    account: config.contractAccount,
    name: 'setmember',
    authorization: [
      {
        actor: config.contractAccount,
        permission: 'active',
      },
    ],
    data: transactionData,
  },
  ];
  (async () => {
  const result = await eos.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 30,
      broadcast: true,
      sign: true,
    }
  );
  console.log(result);
  calculatePreformance(result.processed.receipt.cpu_usage_us,  result.processed.receipt.net_usage_words);
  })();

}

async function insertDataIntoEOSIO(name, state, participant, signatures, timestamp, destination) {
  const pos = [];

  for (const homardId of signatures) {
    const indices = hashage.getIndices(homardId, seeds, filterSize);
    pos.push(...indices);
  }
  // console.log(pos);
  const transactionData = {
    member: name,
    state : state,
    participant : participant,
    positions: pos.map(({ position_in_table, position_in_element }) => ({ 
        first: position_in_table,
        second: position_in_element,
    })),
    num : signatures.length,
    timestamp : timestamp,
    destination : destination,
  };

  const actions = [
  {
    account: config.contractAccount,
    name: 'insert',
    authorization: [
      {
        actor: config.contractAccount,
        permission: 'active',
      },
    ],
    data: transactionData,
  },
  ];
  (async () => {
  const result = await eos.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 30,
      broadcast: true,
      sign: true,
    }
  );
  console.log(result);
  calculatePreformance(result.processed.receipt.cpu_usage_us,  result.processed.receipt.net_usage_words);
  })();
}

async function calculateSimCoefficient(sender, receiver, destination) {
  const transactionData = {
    sender: sender,
    receiver: receiver,
    destination: destination,
  };

  const actions = [
    {
      account: config.contractAccount,
      name: 'simcoef',
      authorization: [
        {
          actor: config.contractAccount,
          permission: 'active',
        },
      ],
      data: transactionData,
    },
  ];

  // Attendez que la transaction soit terminée et que la promesse soit résolue
  const result = await eos.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 30,
      broadcast: true,
      sign: true,
    }
  );

  console.log(result);
  calculatePreformance(result.processed.receipt.cpu_usage_us,  result.processed.receipt.net_usage_words);
}


async function getSimilarityValue() {
  try {

    const result = await rpc.get_table_rows({
      json: true,
      code: config.contractAccount,
      scope: config.contractAccount,
      table: 'simresult',
    });

    if (result.rows.length > 0) {
      return result;
    } else {
      console.log('Aucune valeur de similarité trouvée.');
      return null;
    }
  } catch (error) {
    console.error('Une erreur est survenue :', error);
    return null;
  }
}

async function setEntry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen) {
  const transactionData = {
    transmitterSig, 
    receiverSignature, 
    timestamp, 
    temperature, 
    humidity, 
    ammoniaConcentration, 
    dissolvedOxygen
  };

  const actions = [
    {
      account: config.contractAccount,
      name: 'setentry',
      authorization: [
        {
          actor: config.contractAccount,
          permission: 'active',
        },
      ],
      data: transactionData,
    },
  ];

  // Attendez que la transaction soit terminée et que la promesse soit résolue
  const result = await eos.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 30,
      broadcast: true,
      sign: true,
    }
  );

  console.log(result);
  calculatePreformance(result.processed.receipt.cpu_usage_us,  result.processed.receipt.net_usage_words);
  return result.processed.block_num;
}


async function calculatePreformance(cpu, net) {
  totalcpu += cpu;
  totalnet += net;

  console.log('Total CPU consomation  :'+ totalcpu);
  console.log('Total NET consomation  :'+ totalnet);
}

module.exports = {
  insertDataIntoEOSIO,
  calculateSimCoefficient,
  getSimilarityValue,
  setMember,
  setEntry
};
