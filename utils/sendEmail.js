// const nodemailer = require("nodemailer");
// const handlebars = require("handlebars");
// const fs = require("fs");
// const path = require("path");
// const { google } = require("googleapis");
// const OAuth2 = google.auth.OAuth2;

// async function sendEmail(email, subject, payload, template) {
//   try {


//     const createTransporter = async () => {
//       const oauth2Client = new OAuth2(
//         process.env.GOOGLE_CLIENT_ID,
//         process.env.GOOGLE_CLIENT_SECRET,
//         "https://developers.google.com/oauthplayground"
//       );
    
//       oauth2Client.setCredentials({
//         refresh_token: process.env.REFRESH_TOKEN
//       });
    
//       // const accessToken = await new Promise((resolve, reject) => {
//       //   oauth2Client.getAccessToken((err, token) => {
//       //     if (err) {
//       //       console.error("Failed to create access token:", err);
//       //       reject("Failed to create access token :(");
//       //     }
//       //     resolve(token);
//       //   });
//       // });
    
//       const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           type: "OAuth2",
//           user: process.env.EMAIL,
//           accessToken : "ya29.a0AfB_byCkGlL6bv6Azc9ujJo26BADMqZZYlgpSi-NfytMxkgsbZjXbH_KoejPWBWugi0pvMw827NvbVqkfEJGjE5-X_qtPNrvBNzkMx_IBnIldS1wX2DVgsRldFtUYGCE-ikoI_FDdiTQwMbVUC5jxU0BnjYoWsCx08wdaCgYKATESARISFQHGX2Mipg6PxvzMmvPp3JYTXEdWdA0171",
//           clientId: process.env.GOOGLE_CLIENT_ID,
//           clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//           refreshToken: process.env.REFRESH_TOKEN
//         }
//       });
    
//       return transporter;
//     };
//     const source = fs.readFileSync(path.join(__dirname, template), "utf8");
//     const compiledTemplate = handlebars.compile(source);


//     const sendEmail = async (emailOptions) => {
//       try {
//         let emailTransporter = await createTransporter();
//         await emailTransporter.sendMail(emailOptions);
//       } catch (error) {
//         console.error("Error sending email:", error);
//         throw error;
//       }
//     };
    
//     await sendEmail({
//       from: process.env.EMAIL,
//       to: email,
//       subject: subject,
//       html: compiledTemplate(payload),
//     });

//     return { success: true };
//   } catch (error) {
//     return error;
//   }
// }

// module.exports = sendEmail;


const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

async function sendEmail(email, subject, payload, template) {
  try {
   
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
      }
    });
    
    const source = fs.readFileSync(path.join(__dirname, template), "utf8");
    const compiledTemplate = handlebars.compile(source);
    const options = {
      from: process.env.EMAIL,
      to: email,
      subject: subject,
      html: compiledTemplate(payload),
    };

    // Use promisify to handle the callback-style function
    const sendMailPromise = (options) => {
      return new Promise((resolve, reject) => {
        transporter.sendMail(options, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        });
      });
    };

    // Send email and wait for the result
    const info = await sendMailPromise(options);
    console.log("Email sent result:", info);

    return { success: true, info };
  } catch (error) {
    return error
  }
}

module.exports = sendEmail;