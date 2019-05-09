var express = require('express');
var router = express.Router();
var config = require('../config');
var nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport 
var transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: config.smtp_email, // generated ethereal user
        pass: config.smtp_password // generated ethereal password
    }
});

var send_forgot_password_email = function(email, host, token) {
  // setup e-mail data with unicode symbols 
  var mailOptions = {
      from: '"Gamerscout " <no-reply@gamerscout.com>', // sender address 
      to: email, // list of receivers 
      subject: 'Password Reset', // Subject line 
      text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  };
  // send mail with defined transport object 
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
      return true;
  });
}

var send_change_password_success_email = function(email) {
  // setup e-mail data with unicode symbols 
  var mailOptions = {
      from: '"Gamerscout " <no-reply@gamerscout.com>', // sender address 
      to: email, // list of receivers 
      subject: 'Your password has been changed', // Subject line
      text: 'Hello,\n\n' + 'This is a confirmation that the password for your account ' + email + ' has just been changed.\n'
  };
  // send mail with defined transport object 
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        }
    });
};

module.exports = {
  send_forgot_password_email: send_forgot_password_email,
  send_change_password_success_email : send_change_password_success_email
}