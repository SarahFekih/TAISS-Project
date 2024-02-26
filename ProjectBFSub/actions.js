const { Product, Logtek, Member, Entry } = require('./models');
const contract = require('./contract');
const { runSubstreamsCommand } = require('./substreams/link');

// Fonction pour initialiser un logtek
async function initlogtek(receiverSignature, logtekSignature, sensors, fishingDate, weight) {

  try {
    const member = await Member.findOne({ receivers: receiverSignature });
    if (!member) {
      throw new Error('Receiver not found');
    }
    if (member.type !== 'fisher' && member.type !== 'ET') {
      throw new Error('Unauthorized action for this member type');
    }
    let logtek = await Logtek.findOne({ logtekSignature });

    // Créez ou mettez à jour le logtek
    if (!logtek) {
      logtek = new Logtek({
        logtekSignature,
        sensors,
        owner: member._id,
        fishingDate,
        weight,
      });
    } else {
      logtek.logtekSignature = logtekSignature;
      logtek.sensors = sensors;
      logtek.owner = member._id;
      logtek.fishingDate = fishingDate;
      logtek.weight = weight;
    }

    await logtek.save();

    return { message: 'Logtek créé avec succès' };
  } catch (error) {
    console.error(error);
    throw new Error('Erreur lors de la création du logtek');
  }
}

// Fonction pour ajouter un produit
async function addProduct(receiverSignature, logtekSignature, productRFID, ownershipTimestamp) {

  try {
    const member = await Member.findOne({ receivers: receiverSignature });
    if (!member) {
      throw new Error('Receiver not found');
    }

    if (member.type !== 'fisher') {
      throw new Error('Unauthorized action for this member type');
    }
    const logtek = await Logtek.findOne({ logtekSignature });
    if (!logtek) {
      throw new Error('Logtek not found');
    }

    const product = new Product({
      productRFID,
      logteks: [logtek._id],
      ownershipHistory: [{ owner: member._id, state: 'Accepted', ownershipTimestamp }],
      conditions: {
        temperature: true,
        humidity: true,
        oxygen: true,
        ammonia: true,
      },
    });
    
    await product.save();

    logtek.productRFID.push(productRFID);
    await logtek.save();

    return { message: 'Product added successfully' };
  } catch (error) {
    console.error(error);
    throw new Error('Erreur lors de l\'ajout du produit');
  }
}
// Fonction pour associer un produit à un logtek
async function associate(receiverSignature, logtekSignature, productRFID) {
  
    try {
     
    const member = await Member.findOne({ receivers: receiverSignature });
    if (!member) {
        throw new Error('Receiver not found');
    }
      if (member.type !== 'ET') {
        throw new Error('Unauthorized action for this member type');
      }
      const logtek = await Logtek.findOne({ logtekSignature });
      if (!logtek) {
        throw new Error('Logtek not found');
      }
  
      const product = await Product.findOne({ productRFID });
      if (!product) {
        throw new Error('Product not found');
      }

      product.logteks.push(logtek._id);
      await product.save();
  
      logtek.productRFID.push(productRFID);
      await logtek.save();
  
      return { message: 'Association performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error associating product');
    }
}

async function setMember(name, type, receiversSig, certification) {
    try {
      // Recherchez si le membre existe déjà par certification
      let member = await Member.findOne({ name });
      await contract.setMember(name, type, certification, receiversSig);
       
      // Créez ou mettez à jour le membre
      if (!member) {
        member = new Member({
          name,
          type,
          receivers: receiversSig,
          certification,
        });
      } else {
        member.name = name;
        member.type = type;
        member.receivers = receiversSig;
      }
      await member.save();
  
      return { message: 'Member set successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error setting member');
    }
  }
  
  // Fonction pour enregistrer une entrée
  async function setEntry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen) {
  
    try {
      const logtek = await Logtek.findOne({ sensors: transmitterSig });
      if (!logtek) {
        throw new Error('Logtek not found');
      }
      const member = await Member.findOne({ receivers: receiverSignature });
      if (!member) {
      throw new Error('Receiver not found');
      }

      const blocknum = await contract.setEntry(transmitterSig, receiverSignature, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen);
  
      // Créez une nouvelle entrée
      const entry = new Entry({
        transmitterSig,
        receiverSig: receiverSignature,
        timestamp,
        temperature,
        humidity,
        ammoniaConcentration,
        dissolvedOxygen,
        blocknum,
      });
      await entry.save();
      
      const temperatureSatisfied = temperature >= 7.0 && temperature <= 15.0;
      const ammoniaConcentrationSatisfied = ammoniaConcentration < 2.0;
      const humiditySatisfied = humidity >= 60.0 && humidity <= 90.0;
      const dissolvedOxygenSatisfied = dissolvedOxygen > 5.0;
  
      // Mettez à jour les produits correspondants dans la base de données
      for (const productRFID of logtek.productRFID) {
        const product = await Product.findOne({ productRFID });
        if (product) {
          if (product.conditions.temperature) {
            product.conditions.temperature = temperatureSatisfied;
          }
          if (product.conditions.ammonia) {
            product.conditions.ammonia = ammoniaConcentrationSatisfied;
          }
          if (product.conditions.humidity) {
            product.conditions.humidity = humiditySatisfied;
          }
          if (product.conditions.oxygen) {
            product.conditions.oxygen = dissolvedOxygenSatisfied;
          }
          if (!temperatureSatisfied || !ammoniaConcentrationSatisfied || !humiditySatisfied || !dissolvedOxygenSatisfied) {
            product.conditions.entries.push(entry._id);
          }
          await product.save();
        }
      }
  
      return { message: 'Entry set successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error setting entry');
    }
  }
  
  async function getEntries(productRFID) {
  
    try {
      const product = await Product.findOne({ productRFID });
      if (!product) {
        throw new Error('Product not found');
      }
      const matchingEntries = await Entry.find({ _id: { $in: product.conditions.entries } });
  
      return matchingEntries;
    } catch (error) {
      console.error(error);
      throw new Error('Error getting entries');
    }
  }
  
  async function enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination) {
  
    try {
      const member = await Member.findOne({ receivers: receiverSignature });
      if (!member) {
        throw new Error('Receiver not found');
      }
  
      const logtek = await Logtek.findOne({ logtekSignature });
      if (!logtek) {
        throw aError('Logtek not found');
      }
  
      if (JSON.stringify(logtek.productRFID) !== JSON.stringify(scannedProductRFIDs)) {
        throw new Error('Product mismatch');
      }
      
      //   let owner2="";
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        if (previousOwnership.state !== 'Delivered') {
          throw new Error('Product is not yet delivered');
        }

        product.ownershipHistory.push({ owner: member._id, state: 'Accepted', ownershipTimestamp: timestamp });
        await product.save();
      }
      await contract.insertDataIntoEOSIO(member.name, 'Received', participant, scannedProductRFIDs, timestamp, destination);
    //   await contract.calculateSimCoefficient(member.name, owner2 );
  
      return { message: 'Enterscan performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing enterscan');
    }
  }

  async function rejectScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination) {
  
    try {
      const member = await Member.findOne({ receivers: receiverSignature });
      if (!member) {
        throw new Error('Receiver not found');
      }
  
      const logtek = await Logtek.findOne({ logtekSignature });
      if (!logtek) {
        throw aError('Logtek not found');
      }
  
      if (JSON.stringify(logtek.productRFID) !== JSON.stringify(scannedProductRFIDs)) {
        throw new Error('Product mismatch');
      }
      
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        if (previousOwnership.state !== 'Delivered') {
          throw new Error('Product is not yet delivered');
        }

        product.ownershipHistory.push({ owner: member._id, state: 'Rejected', ownershipTimestamp: timestamp });
        await product.save();
      }
      await contract.insertDataIntoEOSIO(member.name, 'Received', participant, scannedProductRFIDs, timestamp, destination);
  
      return { message: 'Rejection performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing rejectscan');
    }
  }
  
  // Fonction pour effectuer une sortie de scan
  async function exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, timestamp, participant, destination) {
  
    try {
      const member = await Member.findOne({ receivers: receiverSignature });
        if (!member) {
        throw new Error('Receiver not found');
        }
  
      const logtek = await Logtek.findOne({ logtekSignature });
      if (!logtek) {
        throw new Error('Logtek not found');
      }
  
      if (JSON.stringify(logtek.productRFID) !== JSON.stringify(scannedProductRFIDs)) {
        throw new Error('Product mismatch');
      } 

      // await contract.initFilter(member.name, 'Delivered', timestamp);
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        // console.log(previousOwnership);
        if (previousOwnership.owner._id.toString() !== member._id.toString() || previousOwnership.state !== 'Accepted') {
          throw new Error('Product is not Accepted by this owner');
        }
        // await contract.insertDataIntoEOSIO(member.name, 'Delivered', participant, [productRFID], timestamp);
        product.ownershipHistory.push({ owner: member._id, state: 'Delivered', ownershipTimestamp: timestamp });
        await product.save();
      }
      await contract.insertDataIntoEOSIO(member.name, 'Delivered', participant, scannedProductRFIDs, timestamp, destination);
 
      return { message: 'Exitscan performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing exitscan');
    }
  }


  async function processSubstreamsData(blocknum) {
    try {
        const substreamsData = await runSubstreamsCommand(blocknum);
        return substreamsData;
    } catch (error) {
        console.error(error);
    }
  }

  async function compareWithDatabase() {
    try {
        const entries = await Entry.find();

        for (const entry of entries) {
            const { transmitterSig, receiverSig, timestamp, temperature, humidity, ammoniaConcentration, dissolvedOxygen } = entry;

            // Exécuter processSubstreamsData avec blocknum de l'entrée actuelle
            const substreamsData = await processSubstreamsData(entry.blocknum);
            console.log(substreamsData);
            console.log('Database entry : \n'+entry);

            // Comparer les valeurs
            const isEqual = (
                transmitterSig === substreamsData.transmitterSig &&
                receiverSig === substreamsData.receiverSig &&
                parseInt(timestamp) === substreamsData.timestamp &&
                temperature === substreamsData.temperature &&
                humidity === substreamsData.humidity &&
                ammoniaConcentration === substreamsData.ammoniaConcentration &&
                dissolvedOxygen === substreamsData.dissolvedOxygen
            );

            if (isEqual) {
                console.log(`Les données pour le blocknum ${entry.blocknum} sont égales.`);
            } else {
                console.log(`Les données pour le blocknum ${entry.blocknum} ne sont pas égales.`);
            }
        }

        console.log('La comparaison est terminée.');
    } catch (error) {
        console.error('Erreur lors de la comparaison avec la base de données :', error);
    }
  }


  module.exports = {
    initlogtek,
    addProduct,
    associate,
    setMember,
    setEntry,
    getEntries,
    enterScan,
    exitScan,
    rejectScan,
    processSubstreamsData,
    compareWithDatabase,
  };
