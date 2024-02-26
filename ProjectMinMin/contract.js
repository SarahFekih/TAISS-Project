// contract.js

const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const config = require('./config');
const fetch = require('node-fetch');

// Configuration de la signature
const signatureProvider = new JsSignatureProvider([config.contractPrivateKey]);

// Configuration de l'API EOSIO
const rpc = new JsonRpc(config.httpEndpoint, { fetch });
const eos = new Api({ rpc, signatureProvider });


let totalcpu=0;
let totalnet=0;

async function addMember (name, type, certification, receiversSig){
  const transactionData = {
    name : name, 
    type : type, 
    certification : certification,
    receiversSig : receiversSig,
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

async function addentrynb(name) {
    // ajouter +1
    const transactionData = {
        name : name
    };
  
    const actions = [
    {
      account: config.contractAccount,
      name: 'addentrynb',
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

  
async function addproductnb(name, state, nbr, participant, timestamp, destination) {
    const transactionData = {
        member : name,
        state : state,
        number : nbr,
        participant : participant,
        timestamp : timestamp,
        destination : destination,
        
    };
  
    const actions = [
    {
      account: config.contractAccount,
      name: 'addproductnb',
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

  async function verifyPro() {
    try {
      const result = await rpc.get_table_rows({
        json: true,
        code: config.contractAccount,
        scope: config.contractAccount,
        table: 'ownership',
      });
  
      if (result.rows.length > 0) {
        console.log('Lignes de la table ownership :', result.rows);
      } else {
        console.log('Aucune ligne trouvée dans la table ownership.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des lignes de la table ownership :', error);
    }
  }
  
  async function verifyEnt() {
    try {
      const result = await rpc.get_table_rows({
        json: true,
        code: config.contractAccount,
        scope: config.contractAccount,
        table: 'members',
      });
  
      if (result.rows.length > 0) {
        // let total=0;
        // // Parcourez les lignes du tableau
        // result.rows.forEach((row) => {
        //   // console.log('Ligne :', row);
        //   const name = row.name;
        //   const number = row.number;
        //   total+= number;
        // });
        // return total;
        return result;
      } else {
        console.log('Aucun résultat trouvé.');
      }
    } catch (error) {
      console.error('Erreur :', error);
    }
  }  

  async function calculatePreformance(cpu, net) {
    totalcpu += cpu;
    totalnet += net;
  
    console.log('Total CPU consomation  :'+ totalcpu);
    console.log('Total NET consomation  :'+ totalnet);
  }  



module.exports = {
  addMember,
  addentrynb,
  addproductnb ,
  verifyPro, 
  verifyEnt
};
