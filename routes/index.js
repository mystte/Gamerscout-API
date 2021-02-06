var express = require("express");
var router = express.Router();
var config = require("../config");

/* GET home page. */
router.get("/", function(req, res, next) {
  if (req.env === "development") {
    return res.redirect("https://" + config.client.staging.url);
  } else {
    return res.redirect("https://" + config.client.prod.url);
  }
});

module.exports = router;
