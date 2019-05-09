var request = require('request-promise');

// Enable cookies
var j = request.jar();
var request = request.defaults({jar:j});

const getClientHeader = function(headers) {
  return {
    'cookie': headers.cookie,
    'user-agent': headers['user-agent'],
    'referer': headers.referer,
  };
}

exports.do_put_request = function(uri, body) {
  var options = {
      method: 'PUT',
      uri: uri,
      jar: j,
      body: body,
      resolveWithFullResponse: true,
      json: true // Automatically stringifies the body to JSON 
    };

    return request(options).then(function(body){
      return body;
    }).catch(function (err) {
      return err;
    });
}

exports.do_post_request = function(uri, body, headers = null) {
  var options = {
      method: 'POST',
      uri: uri,
      jar: j,
      body: body,
      resolveWithFullResponse: true,
      json: true // Automatically stringifies the body to JSON 
    };
    if (headers) {
      options.headers = getClientHeader(headers);
    }
    return request(options).then(function(body, err){
      return body;
    }).catch(function (err) {
      return err;
    });
}

exports.do_delete_request = function(uri, body) {
  var options = {
      method: 'DELETE',
      uri: uri,
      jar: j,
      body: body,
      resolveWithFullResponse: true,
      json: true // Automatically stringifies the body to JSON 
    };

    return request(options).then(function(body){
      return body;
    }).catch(function (err) {
      return err;
    });
}

exports.do_get_request = function(uri, headers = null) {
  var options = {
      uri: uri,
      jar: j,
      resolveWithFullResponse: true,
      json: true // Automatically stringifies the body to JSON 
    };
    if (headers) {
      options.headers = getClientHeader(headers);
    }
    return request(options).then(function(body){
      return body;
    }).catch(function (err) {
      return err;
    });
}
