const crypto = require("crypto");

function getIndices(identifier, seeds, filterSize) {

  
  const indices = [];
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const seededIdentifier = identifier + seed.toString(); // Concatenate seed to the identifier
    const hashBuffer = crypto.createHash('sha3-256');
    const hash_i = hashBuffer.update(seededIdentifier).digest().readUInt32LE(0) % filterSize;
    const position_in_table = Math.floor(hash_i / 64);
    const position_in_element = hash_i % 64;
    indices.push({ position_in_table, position_in_element });
  }

  return indices;
}
  
  module.exports = {
    getIndices,
  };

  
