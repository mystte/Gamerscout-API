var express = require('express');
var router = express.Router();
var User = require('../models/user');
var flash = require('express-flash');
var logic_forgot_password = require('../logics/logic_forgot_password');
var Q = require('q');
var md5 = require('md5');

// View triggered when user successfully updated his password
router.get('/_/wrong_token', function(req, res, next) {
  res.render('wrong_token');
})

// View for wrong token
router.get('/_/password_updated', function(req, res, next) {
  res.render('password_updated');
})

// Go to the webview to reset password
router.get('/:token', function(req, res, next) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/reset/_/wrong_token');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

// Reset password for a given token
router.post('/:token', function(req, res, next) {
  return Q().then(function() {
    return User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }});
  }).then(function(user, err) {
    if (!user || err) {
      flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('back');
    } else {
      if (req.body.password.length >= 6 && req.body.password == req.body.confirm) {
        user.password = md5(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.save();
        logic_forgot_password.send_change_password_success_email(user.email);
        res.redirect('/reset/_/password_updated');
      } else if (req.body.password.length < 6) {
        res.render('reset', {
          user: req.user,
          length_error : true
        });
      } else if (req.body.password != req.body.confirm) {
        res.render('reset', {
          user: req.user,
          match_error : true
        });
      }
    }
  }).catch(function(reason) {
    console.log(__filename, reason);
  });
});

module.exports = router;