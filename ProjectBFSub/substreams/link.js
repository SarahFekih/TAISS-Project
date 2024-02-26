const { exec } = require('child_process');

const runSubstreamsCommand = (blocknum) => {
    return new Promise((resolve, reject) => {
        // exec('substreams run -e jungle4.firehose.eosnation.io:9001 prom_out -s 103661974 -t +1000 -o jsonl', (err, stdout, stderr) => { //102465727
        exec('substreams run -e jungle4.firehose.eosnation.io:9001 prom_out -s ' + blocknum + ' -t +1 -o jsonl', (err, stdout, stderr) => { 

            if (err) {
                reject(`Error: ${err.message}`);
                return;
            }

            const lines = stdout.split('\n').slice(1, -2);

            const transformedData = lines.map(line => {
                const json = JSON.parse(line);
                const {
                    receiverSignature,
                    transmitterSig,
                    timestamp,
                } = json["@data"].operations[0].labels;
                const {
                    value: temperature,
                } = json["@data"].operations.find(op => op.name === "temperature").gauge;
                const humidity = json["@data"].operations.find(op => op.name === "humidity").gauge.value;
                const ammoniaConcentration = json["@data"].operations.find(op => op.name === "ammonia_concentration").gauge.value;
                const dissolvedOxygen = json["@data"].operations.find(op => op.name === "dissolved_oxygen").gauge.value;

                return {
                    receiverSignature,
                    transmitterSig,
                    timestamp,
                    temperature,
                    humidity,
                    ammoniaConcentration,
                    dissolvedOxygen
                };
            });

            resolve(transformedData);
        });
    });
};

module.exports = { runSubstreamsCommand };

