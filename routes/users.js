var express = require('express');
var router = express.Router();
var config = require("../config");
var constants = require('../utils/constants');
var User = require("../models/user");
var Receipt = require("../models/receipt");
var mongoose = require("mongoose");
var request = require("request-promise");
var Q = require("q");
var crypto = require("crypto");
var logic_forgot_password = require("../logics/logic_forgot_password");
var ios_inapp_purchase = require("../logics/ios_inapp_purchase");
var strings_utils = require('../utils/strings');
const environment = require('../global').environment;
var emailCheck = require('email-check');
var slack = require ('../utils/slack');
var nodemailer = require('nodemailer');

// Upload images library
var multer  = require('multer');
// Avatar upload file
var upload = multer({ dest: 'public/images/avatars' });
// Allowed images types
var allowed_images = ["image/jpeg", "image/png", "image/jpg"];

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

// Format export for user login
var format_login_export = function(user) {
  if (user.password) delete user.password;
  if (user.good_answers) delete user.good_answers;
  if (user.good_answers_in_a_row) delete user.good_answers_in_a_row;
  if (user.first_good_answer) delete user.first_good_answer;
  if (user.trophies) delete user.trophies;
  return user;
}

var sendValidateAccountEmail = function (email, host, token) {
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: '"Gamerscout " <no-reply@gamerscout.com>', // sender address
    to: email, // list of receivers
    subject: 'Validate your account', // Subject line
    text: 'You are receiving this email because you (or someone else) have created an account on Gamerscout.\n\n' +
    'Please click on the following link, or paste this into your browser to complete the validation process:\n\n' +
    host + '/v/' + token + '\n\n' +
      'If you did not request this, please ignore this email.\n'
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
    return true;
  });
}

const sendValidatePasswordEmail = (email, host, token) => {
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: '"Gamerscout " <no-reply@gamerscout.com>', // sender address
    to: email, // list of receivers
    subject: 'Password update notification', // Subject line
    text: 'You are receiving this email because you (or someone else) have requested a new password for your Gamerscout account.\n\n' +
      'Please click on the following link, or paste this into your browser to complete the validation process:\n\n' +
      host + '/p/' + token + '\n\n' +
      'If you did not request this, just ignore this email.\n'
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
    return true;
  });
}

var sendUpdateEmailNotification = function (email, host) {
  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: '"Gamerscout " <no-reply@gamerscout.com>', // sender address
    to: email, // list of receivers
    subject: 'Update on your Gamerscout account', // Subject line
    text: 'You are receiving this email because you (or someone else) have updated your gamerscout email.\n\n' +
      'If you did request this, please ignore this email. Otherwise, please get in touch with us as soon as possible\n'
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
    return true;
  });
}

// Get all users
router.get('/', function(req, res, next) {
  return Q().then(function() {
    return User.find();
  }).then(function(users, err) {
    if (err) {
      console.log(err);
      res.status(500).json({error : "Internal Server Error"});
    } else {
      res.status(200).json(users);
    }
  }).catch(function(reason) {
    console.log(err);
    res.status(500).json({error : "Internal Server Error"});
  });
})

router.post('/validate_password', async function (req, res, next) {
  if (!req.session.email && !req.session._id) return res.status(403).json({ error: 'errAuthenticationRequired' });
  const userEmail = req.session.email;
  const password = req.body.password ? req.body.password : null;

  const currentUser = await User.findOne({ $or: [{ email: userEmail }, { facebookEmail: userEmail }] });

  if (!currentUser) return res.status(400).json({ error: 'errUserNotFound' });

  const isMatch = await currentUser.comparePassword(password, currentUser.password);

  if (isMatch) {
    res.status(200).json({ message: 'success' });
  } else {
    res.status(400).json({ error: 'errWrongPassword' });
  }
});

router.post('/add_facebook', async function(req, res, next) {
  // return res.status(400).json({ error: "errApiDisabled" });
  if (!req.session.email && !req.session._id) return res.status(403).json({ error: 'authentication required' });
  const token = req.body.token ? req.body.token : null;

  const facebookProfile = JSON.parse(await request(config.facebook_url + "/" + config.facebook_url_profile + token));

  if (facebookProfile.email && facebookProfile.id) {
    const facebookUser = await User.findOne({ $or: [{ email: facebookProfile.email }, { facebookEmail: facebookProfile.email }] }, { twitter_id: 0, __v: 0 });
    const facebookUserExists = (facebookUser !== null);

    if (facebookUserExists) {
      res.status(400).json({ error: "errUserExists" });
    } else {
      const loggedUser = await User.findOne({ $or: [{ email: req.session.email }, { facebookEmail: req.session.email }] }, { twitter_id: 0, __v: 0 });
      loggedUser.facebookEmail = facebookProfile.email;
      await loggedUser.save();
      res.status(200).json({ message: "success" });
    }
  } else {
    res.status(400).json({ error: "errWrongToken" });
  }
});

// Facebook login
router.post('/facebook_auth', function(req, res, next) {
  var _id = mongoose.Types.ObjectId();
  var access_token = req.body.access_token ? req.body.access_token : null;
  var user_json = null;

  request(config.facebook_url + "/" + config.facebook_url_profile + access_token).then(function (result) { // Get facebook profile
    var result_json = JSON.parse(result);
    request(config.facebook_url + "/" + result_json.id + config.facebook_url_picture + access_token).then(function(picture_result) { // Get facebook profile picture
          var picture_json = JSON.parse(picture_result);
          if (result_json.email && result_json.id) {
            var uri = req.protocol + "://" + req.header('host') + '/api/1/users/login';
            return Q().then(function() {
              return User.findOne({ $or: [{ email: result_json.email }, { facebookEmail: result_json.email }]}, {twitter_id: 0, __v: 0});
            }).then(function(user, err) {
              if (err) {
                console.log(__filename, err);
                res.status(500).json({ error: "errInternal"});
              } else if (!user) {
                var username = result_json.first_name + result_json.last_name;
                var username = username.replace(" ","");
                // Create a user if the user doesn't exist
                var newUser = new User({
                  _id : _id,
                  facebook_id : result_json.id,
                  username : username,
                  password : "fb" + result_json.id + "&&" + result_json.email,
                  facebookEmail : result_json.email,
                  gender : result_json.gender ? result_json.gender : 'unknown',
                  avatar : picture_json.data.url,
                  first_name : result_json.first_name ? result_json.first_name : null,
                  last_name : result_json.last_name ? result_json.last_name : null,
                  date_of_birth : result.birthday,
                  isAutomaticGeneratedPwd: true,
                  validateAccountToken: strings_utils.generateRandomString(28),
                });
                return Q().then(function() {
                  user_json = JSON.parse(JSON.stringify(newUser));
                  return newUser.save();
                }).then(function() {
                  if (environment === 'production') slack.slackNotificationSubscriptions('Congratulation boyz!!! You have a new gamer in your community : `' + username + '`');
                  req.session.email = result_json.email;
                  req.session._id = _id;
                  req.session.fb_id = result_json.id;
                  sendValidateAccountEmail(result_json.email, req.protocol + "://" + constants.CLIENT_BASE_URL, newUser.validateAccountToken);
                  return res.status(201).json({
                    ...format_login_export(user_json),
                    "gamerscout-api-session": req.cookies['gamerscout-api-session'],
                  });
                });
              } else {
                // Login the found user
                return Q().then(function() {
                  if (user.email && !user.facebookEmail) {
                    user.facebookEmail = user.email;
                    user.email = null;
                  }
                  user.avatar = picture_json.data.url;
                  user.facebook_id = result_json.id;
                  user_json = JSON.parse(JSON.stringify(user));
                  return user.save();
                }).then(function() {
                  req.session.email = result_json.email;
                  req.session._id = user_json._id;
                  req.session.fb_id = result_json.id;
                  req.session.validated = user_json.validated;
                  return res.status(201).json({
                    ...format_login_export(user_json),
                    "gamerscout-api-session": req.cookies['gamerscout-api-session'],
                  });
                });
              }
            }).catch(function(reason) {
              console.log(__filename, reason.message);
              res.status(500).json({error : "errInternal"});
            });
          } else {
            res.status(400).json({error : "errWrongToken"});
          }
      }).catch(function (err) {
        // Crawling failed...
        console.log(__filename, reason.message);
        res.status(500).json({ error: "errInternal"});
      });
  });
});

router.post('/facebook_disconnect', async function(req, res) {
  if (!req.session.email && !req.session._id) return res.status(403).json({ error: 'authentication required' });
  const foundUser = await User.findOne({ _id: req.session._id });

  if (!foundUser.facebookEmail) return res.status(400).json({ error: 'errNoFacebookEmail' });
  if (foundUser.isAutomaticGeneratedPwd) return res.status(400).json({ error: 'errPasswordUpdateRequired' });
  if (foundUser.facebookEmail) {
    if (!foundUser.email) foundUser.email = foundUser.facebookEmail;
    foundUser.facebook_id = 0;
    foundUser.facebookEmail = null;
  }

  await foundUser.save();

  res.status(201).json({ message: 'success' });
});

router.post('/validation/email/resend', function(req, res, next) {
  if (!req.session.email && !req.session._id) return res.status(403).json({ error: 'authentication required' });
  User.findOne({ $or: [{ email: req.session.email }, { facebookEmail: req.session.email }] }).then((user) => {
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      const receiverEmail = user.emailToValidate ? user.emailToValidate : req.session.email;
      user.validateAccountToken = strings_utils.generateRandomString(28);
      user.save().then(() => {
        sendValidateAccountEmail(receiverEmail, req.protocol + "://" + constants.CLIENT_BASE_URL, user.validateAccountToken);
        res.status(201).json({ msg: 'success' });
      });
    }
  });
});

// Sign up route
router.post('/signup', function(req, res, next) {
  var _id = mongoose.Types.ObjectId();
  var username = req.body.username ? req.body.username : null;
  var password = req.body.password ? req.body.password : null;
  var email = req.body.email ? req.body.email : null;
  var gender = req.body.gender ? req.body.gender : null;
  var avatar = req.body.avatar ? req.body.avatar : null;
  var first_name = req.body.first_name ? req.body.first_name : null;
  var last_name = req.body.last_name ? req.body.last_name : null;
  var date_of_birth = req.body.date_of_birth ? req.body.date_of_birth : null;
  var newsletter = req.body.newsletter ? req.body.newsletter : false;

  if (!username || !password || !email) {
    res.status(400).json({ error: 'errMissingParam'});
  } else {
    // Create the new user
    var newUser = new User({
      _id : _id,
      username : username,
      password : password,
      email : email,
      gender : gender,
      avatar : avatar,
      first_name : first_name,
      last_name : last_name,
      date_of_birth : date_of_birth,
      newsletter: newsletter,
    });
    return Q().then(function() {
      return User.findOne({ email: email });
    }).then(function(user, err) {
      if (err) {
        console.log(__filename, err);
        return res.status(500).json({error : "errInternal"});
      } else if (user) {
        return res.status(400).json({error : "errUserExists"});
      } else {
        newUser.save().then(function(createdUser) {
          if (environment === 'production') slack.slackNotificationSubscriptions('Congratulation boyz!!! You have a new gamer in your community : `' + username + '`');
          sendValidateAccountEmail(createdUser.email, req.protocol + "://" + constants.CLIENT_BASE_URL, createdUser.validateAccountToken);
          return res.status(201).json({message : "success"});
        }).catch(function(error) {
          if (error.name === "ValidationError") {
            if (error.errors.email) return res.status(400).json({ error: 'errWrongEmail' });
            if (error.errors.username) return res.status(400).json({ error: 'errWrongUsername' });
            if (error.errors.password) return res.status(400).json({ error: 'errWrongPassword' });
          }
          if (error.code === 11000) return res.status(400).json({ error: 'errUserExists' });
          return res.status(400).json({ error : error.message });
        });
      }
    }).catch(function(reason) {
      console.log(reason.message);
    });
  }
});

// Delete a specific user. used for testing only
router.delete('/delete/:user_id', function(req, res, next) {
  var user_id = req.params.user_id ? req.params.user_id : null;
  var app_id = req.headers["x-api-client-id"] ? req.headers["x-api-client-id"] : null;

  User.findOne({_id : user_id} , function(err, user) {
    if (err) {
      res.status(400).json({error : err});
      return;
    } else if (!user) {
      res.status(404).json({ error: "errUserNotFound"});
      return;
    } else {
      // Remove the user from the database
      user.remove();
      res.status(201).json({message : "User successfully removed"});
      return;
    }
  });
});

// Login route
router.post('/login', function(req, res, next) {
  var email = req.body.email ? req.body.email : null;
  var password = req.body.password ? req.body.password : null;
  var user_json = null;

  if (email && password) {
    return Q().then(function() {
      return User.findOne({ email: email }, {
        passwordToValidate: 0,
        twitter_id: 0,
        __v:0
      });
    }).then(function(user, err) {
      if (err) {
        console.log(__filename, err);
        res.status(500).json({ error: "errInternal"}); return Q.reject();
      } else if (!user) {
        res.status(400).json({ error: "errUserNotFound"}); return Q.reject();
      } else {
        user_json = JSON.parse(JSON.stringify(user));
        return user.comparePassword(password, user.password);
      }
    }).then(function(isMatch) {
      if (isMatch == true) { // User logged in
        req.session.email = email;
        req.session._id = user_json._id;
        req.session.validated = user_json.validated;
        req.session.fb_id = null;
        res.status(201).json({
          ...user_json,
          "gamerscout-api-session": req.cookies['gamerscout-api-session'],
        });
        } else {
          res.status(400).json({error : "errWrongPassword"});
        }
    }).catch(function(reason) {
        console.log(__filename, reason.message);
        res.status(500).json({error : "errInternal"});
    });
  } else {
    res.status(400).json({error : 'errMissingParam'});
  }
});

// Logout route
router.post('/logout', function(req, res, next) {
  // If there is a session
  if (req.session.email) {
    req.session.destroy(function(err){
      if(err){
        res.status(400).json({error : err});
      } else {
        res.status(205).json({message : "success"});
      }
    });
  } else {
    res.status(400).json({error : "errNoLoggedInUser"});
  }
});

// Forgotten_password
router.post('/forgotten_password', function(req, res, next) {
  var found_user = null;
  var email = req.body.email ? req.body.email : null;

  if (email) {
    User.findOne({ $or: [{ email }, { facebookEmail: email }] }, function(err, user) {
      if (err) {
        res.status(400).json({error : err});
        return;
      } else if (user) {
        found_user = user;
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          found_user.resetPasswordToken = token;
          found_user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
          found_user.save();
          logic_forgot_password.send_forgot_password_email(email, req.protocol + "://" + req.header('host'), token);
        });
        res.status(200).json({ message: "success" });
      } else { // User not found
        res.status(200).json({ message: "success" });
      }
    })
  } else {
    res.status(400).json({error : "errMissingParam"});
  }
});

// Upload avatar for a specific user
router.post('/:user_id/avatar', upload.single('avatar'), function(req, res, next) {
  var file = req.file;

  if (req.session.email) {
    var user_id = req.params.user_id ? req.params.user_id : null;
    if (file) {
      if (allowed_images.indexOf(file.mimetype) == -1) {
        fs.unlink(file.path);
        res.status(400).json({error : "errBadFormat"});
      } else {
        return Q().then(function() {
          return User.findOne({_id : user_id});
        }).then(function(user, err) {
          if (err) {
            res.status(400).json({error : err});
          } else if (!user) {
            res.status(400).json({error : "errUserNotFound"});
          } else if (req.session.email !== user.email){
            res.status(403).json({error : "Trying to modify another user's profile"});
          } else {
            user.avatar = req.protocol + "://" + req.header('host') + "/" + file.path.replace("public/", "");
            user.save();
            res.status(204).json({message : "Image Successfully Uploaded"});
            return;
          }
        }).catch(function(reason) {
          res.status(500).json({error : reason.message});
        });
      }
    } else {
      res.status(400).json({error : "No image found"});
    }
  } else {
    res.status(401).json({error : "Authentication required"});
  }
});

// Generate a new password using email validation
router.post('/newPasswordRequest', async (req, res, next) => {
  const password = req.body.password || null;

  if (!req.session.email) return res.status(401).json({ error: "errAuthenticationRequired" });
  if (!password) return res.status(400).json({ error: "errMissingPassword" });

  const loggedUser = await User.findOne({ _id: req.session._id });
  if (!loggedUser) return res.status(400).json({ error: "errCannotFindLoggedUser" });

  loggedUser.passwordToValidate = password;
  loggedUser.resetPasswordToken = await crypto.randomBytes(20).toString('hex');
  loggedUser.resetPasswordExpires = Date.now() + 3600000;

  const result = await loggedUser.save();
  const email = req.session.email;

  if (!result) return res.status(400).json({ message: "errCannotSaveUser" });

  sendValidatePasswordEmail(email, req.protocol + "://" + constants.CLIENT_BASE_URL, loggedUser.resetPasswordToken);
  return res.status(200).json({ message: "success" });
});

// Validate new requested password
router.post('/tokenPasswordValidation', async (req, res, next) => {
  const token = req.body.token || null;

  if (!token) return res.status(400).json({ error: "errMissingToken" });

  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ error: "errWrongToken" });
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.isAutomaticGeneratedPwd = false;
  user.password = user.passwordToValidate;
  user.passwordToValidate = undefined;
  const result = await user.save();

  if (!result) return res.status(400).json({ message: "errCannotSaveUser" });

  return res.status(200).json({ message: "success" });
});

// Modify actual user settings
router.put('/:user_id', async function(req, res, next) {
  if (req.session.email) {
    var user_id = req.params.user_id ? req.params.user_id : null;

    return Q().then(async function() {
      return User.findOne({_id : user_id});
    }).then(async function(user, err) {
      if (err) {
        res.status(400).json({error : err});
        return;
      // User not found
      } else if (!user) {
        return res.status(400).json({ error: "errUserNotFound"});
      // Check if the user_id is the same as the current session
      } else if (user.email == req.session.email || user.facebookEmail === req.session.email) {
        var username = req.body.username ? req.body.username : user.username;
        var first_name = req.body.first_name ? req.body.first_name : user.first_name;
        var last_name = req.body.last_name ? req.body.last_name : user.last_name;
        var date_of_birth = req.body.date_of_birth ? req.body.date_of_birth : user.date_of_birth;
        var gender = req.body.gender ? req.body.gender : user.gender;
        var pwd = req.body.password ? req.body.password : user.password;
        var email = req.body.email ? req.body.email : null;

        user.username = username;
        user.first_name = first_name;
        user.last_name = last_name;
        user.date_of_birth = date_of_birth;
        user.gender = gender;
        const isSamePassword = await user.comparePassword(pwd, user.password);
        if (!isSamePassword) {
          user.password = pwd;
          user.isAutomaticGeneratedPwd = false;
        } else {
          return res.status(400).json({ error: "errSamePassword" });
        }

        if (email) {
          // We cannot change user email directly
          user.validateAccountToken = strings_utils.generateRandomString(28);
          user.emailToValidate = email;
          user.validated = false;
        }
        // Check if username is already taken
        if (req.body.username) {
          User.findOne({ username: req.body.username }, function(error, result) {
            if (!result || (result && result._id == user_id)) {
              user.save().then(() => {
                // If we have a new email, we send back the validation email
                if (email) {
                  sendUpdateEmailNotification(req.session.email);
                  sendValidateAccountEmail(email, req.protocol + "://" + constants.CLIENT_BASE_URL, user.validateAccountToken);
                }
                res.status(201).json({ message: "success" });
              }).catch((err) => {
                console.log(err);
              });
            } else {
              res.status(400).json({ error: "errUserNameExists" });
            }
          });
        } else {
          return user.save().then(() => {
            // If we have a new email, we send back the validation email
            if (email) {
              sendUpdateEmailNotification(req.session.email);
              sendValidateAccountEmail(email, req.protocol + "://" + constants.CLIENT_BASE_URL, user.validateAccountToken);
            }
            res.status(201).json({ message: "success" });
          }).catch((err) => {
            console.log(err);
          });
        }

      } else {
        res.status(401).json({ error: "errWrongUserId" });
      }
    }).catch(function(reason) {
      console.log(__filename, reason.message);
    });
  } else {
    res.status(401).json({error : "errAuthenticationRequired"});
  }
});

// Retrieve authenticated user profile
router.get('/_/authenticated', function(req, res, next) {
  if (req.session._id) {
    return Q().then(function() {
      return User.findOne({_id : req.session._id});
    }).then(function(user, err) {
      if (err) {
        res.status(500).json({ error: "errInternal"});
        console.log(reason);
      } else if (!user) {
        res.status(400).json({ error: "errUserNotFound"});
      } else {
        res.status(200).json(user);
      }
    }).catch(function(reason) {
      res.status(500).json({ error: "errInternal"});
      console.log(reason);
    });
  } else {
    res.status(200).json({});
  }
});

// Retrieve user based on user email
router.get('/_/email/:user_email', function(req, res, next) {
  var email = req.params.user_email;

  return Q().then(function() {
    return User.findOne({email: email}, {trophies:0});
  }).then(function(user, err) {
    if (err) {
      console.log(err); res.status(500).json({ error: "errInternal"});
    } else if (!user) {
      res.status(400).json({ error: "errUserNotFound"});
    } else {
      res.status(200).json(user);
    }
  });
});

// Retrieve user profile based on user_id
router.get('/:user_id', function(req, res, next) {
  var lang = req.query.lang ? req.query.lang : "en";
  var user_id = req.params.user_id ? req.params.user_id : null;
  return Q().then(function() {
    return User.findOne({_id : user_id});
  }).then(function(user, err) {
    if (err) {
      console.log(reason.message);
      res.status(500).json({error : "Internal Server Error"});
    } else if (!user) {
      res.status(404).json({error : "User not found"});
    } else {
      var user_export = {
        email : user.email,
        username : user.username,
        _id : user._id,
        date_of_birth : user.date_of_birth,
        last_name : user.last_name,
        first_name : user.first_name,
        avatar : user.avatar,
        gender: user.gender
      };
      res.status(200).json(user_export);
    }
  }).catch(function(reason) {
    console.log(reason.message);
    res.status(500).json({error : "Internal Server Error"});
  });
});

module.exports = router;
