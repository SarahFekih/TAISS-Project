
const express = require('express');
const { addProduct, initLogtek, associate, getEntries, setMember, rejectscan, enterScan, exitScan, setentry } = require('./contract');

const router = express.Router();
// const bodyParser = require('body-parser');

// router.use(bodyParser.json({ limit: '50mb' }));
// router.use(bodyParser.urlencoded({ limit: '50mb', extended: true , parameterLimit:5000000}));


router.post('/addproduct', async (req, res) => {
  const { receiverSignature, logtekSignature, productRFID, ownershipTimestamp } = req.body;

  // Appelle à la fonction d'interaction avec le contrat intelligent
  await addProduct(receiverSignature, logtekSignature, productRFID, ownershipTimestamp);

  res.json({ message: 'Product added successfully' });
  
});

router.post('/initlogtek', async (req, res) => {
  const { receiverSignature, logtekSignature, sensors, fishingDate, weight } = req.body;
  await initLogtek(receiverSignature, logtekSignature, sensors, fishingDate, weight);
  res.json({ message: 'Logtek added successfully' });
});

router.post('/associate', async (req, res) => {
  const { receiverSignature, logtekSignature, productRFID, timestamp } = req.body;

  // Appelle à la fonction d'interaction avec le contrat intelligent
  await associate(receiverSignature, logtekSignature, productRFID, timestamp);

  res.json({ message: 'association performed successfully' });
});


// Route pour récupérer les entrées
router.get('/entries/:productRFID', async (req, res) => {
  const { productRFID } = req.params;

  // Appel à la fonction d'interaction avec le contrat intelligent
  const entries = await getEntries(productRFID);

  res.json({ entries });
});
router.post('/setmember', async (req, res) => {
  const { name, type, receiversSig, certification } = req.body;
  // Appel à la fonction d'interaction avec le contrat intelligent
  await setMember(name, type, receiversSig, certification);
  res.json({ message: 'Member set successfully' });
});
router.post('/enterscan', async (req, res) => {
  const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination} = req.body;

  // Appel à la fonction d'interaction avec le contrat intelligent
  await enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination);

  res.json({ message: 'Enterscan performed successfully' });
});

router.post('/rejectscan', async (req, res) => {
  const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant } = req.body;

  // Appel à la fonction d'interaction avec le contrat intelligent
  await rejectscan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant);

  res.json({ message: 'Rejection performed successfully' });
});

router.post('/setentry', async (req, res) => {
  const { transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen } = req.body;

  // Appel à la fonction d'interaction avec le contrat intelligent
  await setentry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen);

  res.json({ message: 'Entry set successfully' });
});

router.post('/exitscan', async (req, res) => {
  const { receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination  } = req.body;

  // Appel à la fonction d'interaction avec le contrat intelligent
  await exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination );

  res.json({ message: 'Exitscan performed successfully' });
});


module.exports = router;