var Q = require('q');
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;
var strings_utils = require('../utils/strings');

// Validator for the password's length
function pwdMinLength (pwd) {
  return pwd.length > 3;
};

// Validator for username's length
function userNameMinLength (v) {
  return v.length > 0;
};

// Regex for email validation
function validateEmail(email) {
  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

// Regex for username validation
function validateUsername(username) {
  const re = /^\w+$/;
  return re.test(username);
};

// Regex for password validation
function validatePassword(password) {
  const re = /^\S+$/;
  return re.test(password);
};

var userSchema = new Schema({
  facebook_id : {type : Number, default:null},
  twitter_id : {type : Number, default:null},
  username: { type: String, required: true,
        validate: [userNameMinLength, 'Username must be 1 char minimum'],
        index: { unique: true }
        }, // more than one char
  email: { type: String, required: true,
       validate: [validateEmail, 'Please provide a valid email address'],
       index: { unique: true }
      },
  validateAccountToken: String,
  validated: { type: Boolean, default: false },
  usedEmails: [String],
  password: { type: String, required: true,
        validate: [pwdMinLength, 'Password must be 4 char minimum'],
        validate: [validatePassword, 'Password cannot have spaces']}, // 4 characters min, no spaces
  gender: {type: String, default: 'unknown'},
  avatar: { type: String, default: null },
  first_name: {type: String, default: null},
  last_name: {type: String, default: null},
  date_of_birth: {type: Date, default: null},
  newsletter: {type: Boolean, default: false},
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { usePushEach: true });

// Add pagination plugin
userSchema.plugin(mongoosePaginate);

// Replace the cleartext password with the hash before creating a user
userSchema.pre('save', function(next) {
    var user = this;
  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);

      // hash the password using our new salt
      bcrypt.hash(user.password, salt, function(err, hash) {
        if (err) return next(err);

        // override the cleartext password with the hashed one
        user.password = hash;
        // Generate account validation token if none
        if (!user.validateAccountToken) user.validateAccountToken = strings_utils.generateRandomString(28);
        next();
      });
  });
});

// Replace the cleartext password with the hash before updating a user
userSchema.pre('update', function(next) {
    var user = this;

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);

      // hash the password using our new salt
    bcrypt.hash(user._update.$set.password, salt, function(err, hash) {
          if (err) return next(err);
          // override the cleartext password with the hashed one
          user._update.$set.password = hash;
          next();
      });
  });
});

userSchema.methods.comparePassword = function(candidate_password, user_password) {
  return Q().then(function() {
    return bcrypt.compare(candidate_password, user_password);
  }).then(function(isMatch) {
    return isMatch
  }).catch(function(reason) {
    console.log(__filename, reason.message);
  });
};

module.exports = mongoose.model('User', userSchema);
