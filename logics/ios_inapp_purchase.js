var express = require('express');
var router = express.Router();
var Q = require('q');
var config = require('../config');
var request = require('request-promise');

var ios_error_map = {
  'err_21000': 'The App Store could not read the JSON object you provided.',
  'err_21002': 'The data in the receipt-data property was malformed.',
  'err_21003': 'The receipt could not be authenticated.',
  'err_21004': 'The shared secret you provided does not match the shared secret on file for your account.',
  'err_21005': 'The receipt server is not currently available.',
  'err_21006': 'This receipt is valid but the subscription has expired. When this status code is returned to your server, the receipt data is also decoded and returned as part of the response.',
  'err_21007': 'This receipt is a sandbox receipt, but it was sent to the production service for verification.',
  'err_21008': 'This receipt is a production receipt, but it was sent to the sandbox service for verification.'
};

var validateIos = function(receipt) {
  console.log(receipt);
  options = {
    method : 'POST',
    uri : config.itunes_validation_url_sandbox,
    body : {
      'receipt-data' : receipt
    },
    json : true
  };
  return request(options).then(function(response) {
    console.log(response);
    if (response.status >= 21000 && response.status <= 21008) {
      response.data = "Error " + response.status + " : " + ios_error_map["err_" + response.status];
      response.req_status = 400;
      response.valid = false;
    } else {
      response.valid = true;
    }
    return response;
  }).catch(function(reason) {
    console.log(__filename, reason);
  });
};

module.exports = {
  validateIos : validateIos
}