const crypto=require('crypto')
const fs=require('fs')
const path=require('path')
const zlib=require('zlib')

const AppendInitVect=require('./AppendInitVect')
const GetKey=require('./GetKey')

function encryptData(file,password)
{
    //Generate a secure, pseudo random IV


    console.log(file,password);

    const initVect=crypto.randomBytes(16)

    //Generate Key from the password
    const KEY=GetKey.findKey(password)
    const readStream=fs.createReadStream(file)
    const gzip=zlib.createGzip()
    const cipher=crypto.createCipheriv('aes256',KEY,initVect)
    const appendInitVect=new AppendInitVect(initVect)

    //Create a write stream with diff file extension
    const writeStream=fs.createWriteStream(path.join(file+".enc"))

    //Main piping
    readStream
    .pipe(gzip)
    .pipe(cipher)
    .pipe(appendInitVect)
    .pipe(writeStream)
}

//encryptData("./images/gsecure_logo.png","abhay");

module.exports.encryptData = encryptData;