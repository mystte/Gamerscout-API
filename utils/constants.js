const config = require('../config');
const ENV = require('express')().get('env');

const getClientBaseUrl = function () {
  let url = config.client.dev.url;
  if (ENV === 'production') {
    url = config.client.prod.url;
  } else if (ENV === 'staging') {
    url = config.client.staging.url;
  }
  return url;
}

const getLolApiKey = () => {
  let lolApiKey = config.lol_api.api_key_dev;
  if (ENV === 'production') {
    lolApiKey = config.lol_api.api_key_prod;
  }
  return lolApiKey;
}

const CLIENT_BASE_URL = getClientBaseUrl();

const LOL_API_KEY = getLolApiKey();

module.exports = {
  CLIENT_BASE_URL,
  LOL_API_KEY, 
  ENV,
}