
const fs = require("fs");
const express = require("express");
const bodyParser = require('body-parser');
const multer = require("multer");
const OAuth2Data = require("./credentials.json");

const encryptData = require('./encrypt').encryptData;
const decryptData = require('./decrypt').decryptData;
const { google } = require("googleapis");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));


var name,pic;
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);


var drive_files=[];




var authed = false;

// If modifying these scopes, delete token.json.
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs");

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: Storage,
}).single("file"); //Field name and max count

// app.get('/',(req,res)=>{
//   res.render('user',{});
// });


function fetchAllFiles(res,success,success_upload,success_download,success_fail){
  const drive = google.drive({
    version:'v3',
    auth:oAuth2Client
  });

 // var drive_files = [];
  var pageToken = null;
// Using the NPM module 'async'

  drive.files.list({
    //q: "",
    pageSize: 200,
    fields: 'files(id,name,originalFilename,mimeType,webContentLink,webViewLink,iconLink,thumbnailLink,hasThumbnail,createdTime,fileExtension)',
    //spaces: 'drive',
    orderBy: 'createdTime desc',
    pageToken: pageToken
  }, function (err, response) {
        if (err) {
          // Handle error
          console.error(err);
          callback(err)
        } else {
          console.log(response.data);
          for(var i=0;i<response.data.files.length;i++){
            drive_files.push(response.data.files[i]);
          }

          //pageToken = response.nextPageToken;
          res.render("user",{
              pic:pic,
              name:name,
              success:success,
              success_upload : success_upload,
              success_download:success_download,
              success_fail:success_fail,
              files:drive_files
          });
          //callback();
        }
      });


}


app.get("/", (req, res) => {
  
  if (!authed) {
    // Generate an OAuth URL and redirect there
    var url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log(url);
    res.render("index", { url: url });
  } else {
    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        console.log(response.data);
        name = response.data.name
        pic = response.data.picture

        fetchAllFiles(res,false,false,false,false);

      }
    });
  }
});

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file);
      console.log(req.body);

      encryptData(req.file.path,req.body.password);

      console.log("=======Successfully encrypted========");

      const drive = google.drive({ version: "v3",auth:oAuth2Client  });
      console.log(req.file.filename+".enc");
      const fileMetadata = {
        name: req.file.filename+".enc",
      };
      const media = {
        //mimeType: UUE,
        body: fs.createReadStream(req.file.path+".enc"),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err, file) => {
          if (err) {
            fetchAllFiles(res,false,true,false,false);
            console.error(err);
          } else {
            //fs.unlinkSync(req.file.path+".enc");
            fs.unlinkSync(req.file.path);
            console.log("======Successfully Uploaded=======");
            fetchAllFiles(res,true,false,false,false);

          }

        }
      );
    }
  });
});


app.post('/download',(req,res)=>{
  console.log(req.body);
  var fileId = req.body.download_file;
  var fileName="./images/"+req.body.file_name;
  var tmpFileName="./images/download.enc"
  var dest = fs.createWriteStream(tmpFileName);
  const drive = google.drive({
    version:'v3',
    auth:oAuth2Client
  });
  drive.files.get({fileId: fileId, alt:'media'}, {responseType:'stream'},
    function(err, ress){
      if(ress == undefined){
        res.render("user",{
          pic:pic,
          name:name,
          success:false,
          success_upload : false,
          success_download:false,
          success_fail:true,
          files:drive_files
        });
      }else{
       ress.data
       .on('end', () => {
          console.log('=====Download Completed=====');
          decryptData(fileName,req.body.password);
          console.log("======Decryption competed====");
          res.render("user",{
            pic:pic,
            name:name,
            success:false,
            success_upload : false,
            success_download:true,
            success_fail:false,
            files:drive_files
          });

       })
       .on('error', err => {
          console.log('Error:', err);
          res.render("user",{
            pic:pic,
            name:name,
            success:false,
            success_upload : false,
            success_download:false,
            success_fail:true,
            files:drive_files
          })
       })
       .pipe(dest);
      }
  });

});
app.get('/logout',(req,res) => {
    authed = false
    res.redirect('/')
})

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        console.log(tokens)
        oAuth2Client.setCredentials(tokens);


        authed = true;
        res.redirect("/");
      }
    });
  }
});

app.listen(5000, () => {
  console.log("App is listening on Port 5000");
});

// const express = require('express');
// const app = express();
// const {google} = require('googleapis');
// const OAuth2Data = require('./credentials.json');
// const multer = require('multer'); 
// const fs = require('fs');
// var async = require("async");

// app.use(express.static('public'));

// const CLIENT_ID = OAuth2Data.web.client_id;
// const CLIENT_SECRET = OAuth2Data.web.client_secret;
// const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];
// var name,pic;

// var Storage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     callback(null, "./images");
//   },
//   filename: function (req, file, callback) {
//     callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
//   },
// });

// var upload = multer({
//   storage: Storage,
// }).single("file"); //Field name and max count


// const oAuth2Client = new google.auth.OAuth2(
//   CLIENT_ID,
//   CLIENT_SECRET,
//   REDIRECT_URL
// );

// console.log(CLIENT_ID,"\n",CLIENT_SECRET,"\n",REDIRECT_URL);

// var authed = false;

// const SCOPES =" https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile"

// app.set("view engine","ejs");

// app.get('/',(req,res)=>{
//     if(!authed){
//         var url = oAuth2Client.generateAuthUrl({
//             access_type : 'offline',
//             scope : SCOPES
//         });

//         console.log(url);
//         res.render("index",{url:url});

//     }else{
//         var oauth2 = google.oauth2({
//             auth: oAuth2Client,
//             version: "v2",
//           });
//           oauth2.userinfo.get(function (err, response1) {
//             if (err) {
//               console.log(err);
//             } else {
//               console.log(response1.data);
//               name = response1.data.name;
//               pic = response1.data.picture;

//               const drive = google.drive({
//                 version:'v3',
//                 auth:oAuth2Client
//               });

//               var drive_files = [];
//               var pageToken = null;
// // Using the NPM module 'async'

//             drive.files.list({
//               //q: "",
//               pageSize: 200,
//               fields: 'files(id,name,originalFilename,mimeType,webContentLink,webViewLink,iconLink,thumbnailLink,hasThumbnail,createdTime,fileExtension)',
//               //spaces: 'drive',
//               orderBy: 'createdTime desc',
//               pageToken: pageToken
//             }, function (err, response) {
//               if (err) {
//                 // Handle error
//                 console.error(err);
//                 callback(err)
//               } else {
//                 console.log(response.data);
//                 for(var i=0;i<response.data.files.length;i++){
//                   drive_files.push(response.data.files[i]);
//                 }

//                 pageToken = response.nextPageToken;
//                 res.render("success",{
//                     pic:pic,
//                     name:name,
//                     success:false,
//                     files:drive_files
//                 });
//                 //callback();
//               }
//             });

//               // async.doWhilst(function (callback) {
                
//               // }, function () {
//               //   return !!pageToken;
//               // }, function (err) {
//               //   if (err) {
//               //     // Handle error
//               //     res.render("success",{
//               //       pic:pic,
//               //       name:name,
//               //       success:false,
//               //       files:drive_files
//               //     });
//               //     console.error(err);
//               //   } else {
//               //     res.render("success",{
//               //       pic:pic,
//               //       name:name,
//               //       success:false,
//               //       files:drive_files
//               //     });
//               //     // All pages fetched
//               //   }
//               // })

              
              

//             }
//           });
//     }
// });


// app.post('/upload',(req,res)=>{
  
//   upload(req,res,function(err){
//     if(err){
//       console.log(err);
//       throw err;
//     } 
//     console.log(req.file.path);
//     const drive = google.drive({
//       version:'v3',
//       auth:oAuth2Client
//     });

//     const filemetedata = {
//       name : req.file.filename
//     }

//     const media ={
//       mimeType : req.file.mimetype,
//       body : fs.createReadStream(req.file.path)
//     }

//     drive.files.create({
//       resource : filemetedata,
//       media : media,
//       fields : "id"
//     },(err,file)=>{
//       if(err) throw err;
//       // delete the file from images folder
//       fs.unlinkSync(req.file.path)
//       res.render("Success",{name:name,pic:pic,success:true});
//     });

//   })
// });

// app.get('/users',(req,res)=>{
//   res.render("user");
// });

// app.get('/google/callback',(req,res)=>{
//     const code = req.query.code;
//     if(code){
//         // get access token
//         oAuth2Client.getToken(code,(err,token)=>{
//             if(err){
//                 console.log("Error in Authentiacting","\n",err);
//             }else{
//                 console.log("Successfully Authenticated");
//                 console.log(token);
//                 oAuth2Client.setCredentials(token);
//                 authed = true;
//                 res.redirect('/');
//             }

//         })
//     }
// });

// app.get('/logout',(req,res) => {
//   authed = false
//   res.redirect('/')
// })

// app.listen(5000,()=>{
//     console.log("App started on 5000 port number");
// })