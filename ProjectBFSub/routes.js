const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const config = require('./config');
const contract = require('./contract');
const mongoDBUtils = require('./models');
const actions = require('./actions');
const bodyParser = require('body-parser');

router.use(bodyParser.json({ limit: '5000mb' }));
router.use(bodyParser.urlencoded({ limit: '5000mb', extended: true, parameterLimit:5000000 }));

// Route pour calculer le coefficient de similarité entre deux filtres de Bloom
router.post('/similarity', async (req, res) => {
  const { sender, receiver, destination } = req.body;
  try {
    //  await pour attendre la réponse de la transaction
    
    await contract.calculateSimCoefficient(sender, receiver, destination);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const coeff = await contract.getSimilarityValue();
    
    // // Affichez le résultat dans la console
    // console.log(result.processed.action_traces[0].console);
    
    // Envoyez le résultat en réponse à la requête HTTP
    res.json({ coefficient: coeff });
    console.log(coeff);
  } catch (error) {
    console.error('Une erreur est survenue :', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.post('/initlogtek', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, sensors, fishingDate, weight } = req.body;
    const result = await actions.initlogtek(receiverSignature, logtekSignature, sensors, fishingDate, weight);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour ajouter un produit
router.post('/addproduct', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, productRFID, ownershipTimestamp } = req.body;
    const result = await actions.addProduct(receiverSignature, logtekSignature, productRFID, ownershipTimestamp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour associer un produit à un logtek
router.post('/associate', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, productRFID } = req.body;
    const result = await actions.associate(receiverSignature, logtekSignature, productRFID);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour définir un membre
router.post('/setmember', async (req, res) => {
  try {
    const { name, type, receiversSig, certification } = req.body;
    const result = await actions.setMember(name, type, receiversSig, certification);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour définir une entrée
router.post('/setentry', async (req, res) => {
  try {
    const { transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen } = req.body;
    const result = await actions.setEntry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour obtenir les entrées d'un produit
router.get('/getentries/:productRFID', async (req, res) => {
  try {
    const { productRFID } = req.params;
    const result = await actions.getEntries(productRFID);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour effectuer une entrée de scan
router.post('/enterscan', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp } = req.body;
    const result = await actions.enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour effectuer une sortie de scan
router.post('/exitscan', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp } = req.body;
    const result = await actions.exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rejectscan', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp } = req.body;
    const result = await actions.rejectScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//par blocknum
router.post('/verifyEntries', async (req, res) => {
  try {
    const result = await actions.compareWithDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
