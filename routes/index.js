var express = require('express');
var router = express.Router();
var config = require('../config');

/* GET home page. */
router.get('/', function(req, res, next) {
  // if (req.env === 'development') {
  //   res.redirect(config.website_devel_url);
  // } else {
  //   res.redirect(config.website_prod_url);
  // }
  res.status(200).json({'status': 'OK'});
});

module.exports = router;
