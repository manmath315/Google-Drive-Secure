const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const getCipherKey = require('./GetKey');

function decryptData( file, password ) {
  // First, get the initialization vector from the file.

  console.log(file,password);


  console.log(file.substr(0, file.lastIndexOf(".")));


    // const readInitVect = fs.createReadStream(file, { end: 15 });
    // console.log("Created Read Stream at ",readInitVect);
    // let initVect;
    // readInitVect.on('data', (chunk) => {
    //   console.log(chunk);
    //   initVect = chunk;
    // });

    var initVect;
    const readInitVect = fs.createReadStream(file, { end: 15 }).on('data',(chunk)=>{
      initVect=chunk;
    });

  
  //  readInitVect.on('data', (chunk) => {
  //   initVect = chunk;
  // });

    // Once we’ve got the initialization vector, we can decrypt the file.
    
    
      console.log("=====Started Decryption====");

      console.log("InitVect value: ",initVect)

      readInitVect.on('close', () => {
        const cipherKey = getCipherKey.findKey(password);
        const readStream = fs.createReadStream(file, { start: 16 });
        const decipher = crypto.createDecipheriv('aes256', cipherKey, initVect);
        const unzip = zlib.createUnzip();
        const finalName = file.substr(0, file.lastIndexOf("."));
        const writeStream = fs.createWriteStream( finalName );
  
        readStream
          .pipe(decipher)
          .pipe(unzip)
          .pipe(writeStream);
  
      console.log("=====Completed Decryption====");
      
  
    
      });
     

  // file=file.substr(0, file.lastIndexOf(".")) + ".enc";

  //console.log(file,password);

  
}

//decryptData("./images/gsecure_logo.png.enc","abhay");

module.exports.decryptData = decryptData;
