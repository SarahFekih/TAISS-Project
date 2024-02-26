const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Importez le module Schema depuis mongoose.

mongoose.connect('mongodb://localhost:27017/taissbf', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ProductSchema = new mongoose.Schema({
  productRFID: String,
  logteks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Logtek', 
  }],
  ownershipHistory: [
    {
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
      },
      state: String,
      ownershipTimestamp: Number,
    },
  ],
  conditions: {
    temperature: Boolean,
    humidity: Boolean,
    oxygen: Boolean,
    ammonia: Boolean,
    entries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entry',
      },
    ],
  },
});

const LogtekSchema = new Schema({
  logtekSignature: String,
  sensors: [String],
  productRFID: [String],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
  },
  fishingDate: String,
  weight: Number,
});

const MemberSchema = new Schema({
  name: String,
  type: String,
  receivers: [String],
  certification: String,
});

const EntrySchema = new Schema({
  transmitterSig: String,
  receiverSig: String,
  timestamp: Number,
  temperature: Number,
  humidity: Number,
  ammoniaConcentration: Number,
  dissolvedOxygen: Number,
  blocknum : Number,
});

const Product = mongoose.model('Product', ProductSchema);
const Logtek = mongoose.model('Logtek', LogtekSchema);
const Member = mongoose.model('Member', MemberSchema);
const Entry = mongoose.model('Entry', EntrySchema);

module.exports = {
  Product,
  Logtek,
  Member,
  Entry,
};

