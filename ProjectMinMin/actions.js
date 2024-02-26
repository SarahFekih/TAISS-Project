// Importez vos modèles de données MongoDB
const { addMember, addentrynb, addproductnb, verifyEnt }= require('./contract');
const { Product, Logtek, Member, Entry } = require('./models');

const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Importez le module Schema depuis mongoose.

mongoose.connect('mongodb://localhost:27017/taissmin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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

    // Sauvegardez le logtek
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

    // Mettez à jour le logtek avec le productRFID
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
    addMember (name, type, certification, receiversSig);
    try {
      let member = await Member.findOne({ certification });
  
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
      // Recherchez le logtek par signature du récepteur
      const logtek = await Logtek.findOne({ sensors: transmitterSig });
      if (!logtek) {
        throw new Error('Logtek not found');
      }
      const member = await Member.findOne({ receivers: receiverSignature });
        if (!member) {
        throw new Error('Receiver not found');
        }
  
      // Créez une nouvelle entrée
      const entry = new Entry({
        transmitterSig,
        receiverSig: receiverSignature,
        timestamp,
        temperature,
        humidity,
        ammoniaConcentration,
        dissolvedOxygen,
      });
      await entry.save();
  
      // les opérations nécessaires pour mettre à jour les conditions des produits associés
      const temperatureSatisfied = temperature >= 7.0 && temperature <= 15.0;
      const ammoniaConcentrationSatisfied = ammoniaConcentration < 2.0;
      const humiditySatisfied = humidity >= 60.0 && humidity <= 90.0;
      const dissolvedOxygenSatisfied = dissolvedOxygen > 5.0;
      let bool = false;
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
            bool= true;
            
          }
          await product.save();
        }
      }
      if (bool)
        {await addentrynb(member.name);}
  
      return { message: 'Entry set successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error setting entry');
    }
  }
  
  // Fonction pour récupérer les entrées d'un produit
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
  
  async function enterScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination) {
    try {
      // Recherchez le membre par signature du récepteur
      const member = await Member.findOne({ receivers: receiverSignature });
      if (!member) {
        throw new Error('Receiver not found');
      }
      const logtek = await Logtek.findOne({ logtekSignature });
      if (!logtek) {
        throw aError('Logtek not found');
      }
  
      // vérifier que les produits scannés correspondent aux produits associés au logtek
      if (JSON.stringify(logtek.productRFID) !== JSON.stringify(scannedProductRFIDs)) {
        throw new Error('Product mismatch');
      }
      let nbr=0;
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        nbr+=1;
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        if (previousOwnership.state !== 'Delivered') {
          throw new Error('Product is not yet delivered');
        }
  
        product.ownershipHistory.push({ owner: member._id, state: 'Accepted', ownershipTimestamp: timestamp });
        await product.save();
      }

      await addproductnb(member.name, 'Received', nbr , participant, timestamp, destination);  
  
      return { message: 'Enterscan performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing enterscan');
    }
  }

  async function rejectScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination) {
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
      let nbr=0;
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        nbr+=1;
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        if (previousOwnership.state !== 'Delivered') {
          throw new Error('Product is not yet delivered');
        }
  
        product.ownershipHistory.push({ owner: member._id, state: 'Rejected', ownershipTimestamp: timestamp });
        await product.save();
      }

      await addproductnb(member.name, 'Received', nbr , participant, timestamp, destination);  
  
      return { message: 'Rejection performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing enterscan');
    }
  }
  
  
  // Fonction pour effectuer une sortie de scan
  async function exitScan(receiverSignature, logtekSignature, scannedProductRFIDs, participant, timestamp, destination) {
    // Vérifiez l'authentification ici si nécessaire
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
      let nbr =0;  
      for (const productRFID of scannedProductRFIDs) {
        const product = await Product.findOne({ productRFID });
        if (!product) {
          throw new Error('Product not found');
        }
        nbr +=1;
        const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
        // console.log(previousOwnership);
        if (previousOwnership.owner._id.toString() !== member._id.toString() || previousOwnership.state !== 'Accepted') {
          throw new Error('Product is not Accepted by this owner');
        }

  
        product.ownershipHistory.push({ owner: member._id, state: 'Delivered', ownershipTimestamp: timestamp });
        await product.save();
      }

      await addproductnb (member.name, 'Delivered', nbr, participant, timestamp, destination);  
      return { message: 'Exitscan performed successfully' };
    } catch (error) {
      console.error(error);
      throw new Error('Error performing exitscan');
    }
  }
  
  // // Fonction pour accepter un produit
  // async function accept(receiverSignature, logtekSignature, timestamp) {
  //   // Vérifiez l'authentification ici si nécessaire
  
  //   try {
  //     // Recherchez le membre par signature du récepteur
  //     const member = await Member.findOne({ receivers: receiverSignature });
  //       if (!member) {
  //       throw new Error('Receiver not found');
  //       }
  
  //     // Recherchez le logtek par signature
  //     const logtek = await Logtek.findOne({ logtekSignature });
  //     if (!logtek) {
  //       throw new Error('Logtek not found');
  //     }
  
  //     for (const productRFID of logtek.productRFID) {
  //       const product = await Product.findOne({ productRFID });
  //       if (!product) {
  //         throw new Error('Product not found');
  //       }
  
  //       const previousOwnership = product.ownershipHistory[product.ownershipHistory.length - 1];
  //       if (previousOwnership.owner._id.toString() !== member._id.toString() || previousOwnership.state !== 'Received') {
  //         throw new Error('Product is not received by this owner');
  //       }
  
  //       product.ownershipHistory.push({ owner: member._id, state: 'Accepted', ownershipTimestamp: timestamp });
  //       await product.save();
  //     }
  
  //     return { message: 'Product accepted successfully' };
  //   } catch (error) {
  //     console.error(error);
  //     throw new Error('Error accepting product');
  //   }
  // }  


  async function verifyEntries() {
    const res = await verifyEnt();
    let totalBC = 0;
    
    if (res.rows.length > 0) {
      for (const row of res.rows) {
        const memberName = row.name;
        const number = row.entries;
        // totalBC+= number;
        const member = await Member.findOne({ name: memberName });
        if (member && member.receivers && member.receivers.length > 0) {
          const matchingEntries = await Entry.find({
            receiverSig: { $in: member.receivers },
            $or: [
              { temperature: { $not: { $gte: 7.0, $lte: 15.0 } } }, // Température en dehors de la plage 7.0-15.0
              { ammoniaConcentration: { $not: { $lt: 2.0 } } },  // Concentration d'ammoniac non inférieure à 2.0
              { humidity: { $not: { $gte: 60.0, $lte: 90.0 } } },   // Humidité en dehors de la plage 60.0-90.0
              { dissolvedOxygen: { $not: { $gt: 5.0 } } },       // Oxygène dissous non supérieur à 5.0
            ],
          });
  
          // Comptez les entrées non conformes
          const nonConformingCount = matchingEntries.length;
  
          // Comparer le nombre d'entrées non conformes avec le "number" du "row"
          if (nonConformingCount !== number) {
            console.log(`Incohérence pour ${memberName}. Entrées non conformes dans DB : ${nonConformingCount}, Total dans BC : ${number}`);
          } else {
            console.log(`Pas d'incohérence pour ${memberName}. Entrées non conformes dans DB : ${nonConformingCount}, Total dans BC : ${number}`);
          }
        } else {
          console.log(`Aucun membre trouvé pour ${memberName} ou pas de receivers définis.`);
        }
      }
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
    // accept,
    verifyEntries
  };
