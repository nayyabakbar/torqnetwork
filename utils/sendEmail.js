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