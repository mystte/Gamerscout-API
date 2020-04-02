var express = require("express");
var router = express.Router();
var config = require("../config");

/* GET home page. */
router.get("/", function(req, res, next) {
  if (req.env === "development") {
    res.redirect("https://" + config.client.staging.url);
  } else {
    res.redirect("https://" + config.client.prod.url);
  }
  res.status(200).json({ status: "OK" });
});

module.exports = router;
