const express = require('express');
const router = express.Router();
const actions = require('./actions');
const contract = require('./contract');
const bodyParser = require('body-parser');

router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Endpoint pour initialiser un logtek
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
    const { receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination } = req.body;
    const result = await actions.enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour accepter un produit
router.post('/rejectscan', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination } = req.body;
    const result = await actions.rejectScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour effectuer une sortie de scan
router.post('/exitscan', async (req, res) => {
  try {
    const { receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination } = req.body;
    const result = await actions.exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verifyProduct', async (req, res) => {
  try {
    // const { name} = req.body;
    const result = await contract.verifyPro();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verifyEntries', async (req, res) => {
  try {
    const result = await actions.verifyEntries();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
