const fs = require('fs');
const Papa = require('papaparse');

const inputFile = 'firstscenario.csv';

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the input file:', err);
    return;
  }

  Papa.parse(data, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const df = results.data;
    //   let p=0;
    //   let a=0;
    //   let l='['
    //     for (let i=1; i< 10001; i++){
    //         l+= '0'.repeat(8 - i.toString().length) + i +'/7;';
    //     }
    //     let nouvelleChaine = l.slice(0, -1);
    //     nouvelleChaine+=']';

      for (let index = 1; index < df.length; index++) {
        if (df[index].action === 'setentry') {
          df[index].timestamp = Number(df[index - 1].timestamp) + 2;
        } else {
          df[index].timestamp = Number(df[index - 1].timestamp) + 2;
        }

      // for (let index = 1; index < df.length; index++) {
      //   if (df[index].action === 'addproduct') {
      //     if (df[index - 1].action === 'addproduct'){
      //       df[index].timestamp = Number(df[index - 1].timestamp);
      //     }
      //     else {
      //       df[index].timestamp = Number(df[index - 1].timestamp)+ 1;
      //     }
      //   } else {
      //   if (df[index].action === 'associate') {
      //     if (df[index - 1].action === 'associate'){
      //       df[index].timestamp = Number(df[index - 1].timestamp);
      //     }
      //     else {
      //       df[index].timestamp = Number(df[index - 1].timestamp)+ 1;
      //     }
      //   }
      //   else {
      //     df[index].timestamp = Number(df[index - 1].timestamp) + 1;
      //   }
      // }
        

    //     if (df[index].action === 'addproduct'){
    //         p+=1;
    //         let ps= p.toString();
    //         df[index].productRFID ='0'.repeat(8 - ps.length) + ps +'/7';
    //         // console.log(df[index].productRFID);
    //         df[index].logtekSignature ='a1111111/7';
    //     }
        // if (df[index].action === 'setentry'){
        //     df[index].transmitterSig = 'DDDD3333';
        // }
    //     if ((df[index].action === 'enterscan')|| (df[index].action === 'exitscan')){
            
    //         df[index].scannedProductRFIDs = nouvelleChaine;
    //     }
    //     if (df[index].action === 'associate'){
    //         a+=1;
    //         let ps= a.toString();
    //         df[index].productRFID ='0'.repeat(8 - ps.length) + ps +'/7';
    //     }
      }

      const csvData = Papa.unparse(df);
      fs.writeFile(inputFile, csvData, (err) => {
        if (err) {
          console.error('Error writing the output file:', err);
        } else {
          console.log('finish');
        }
      });
    },
  });
});
