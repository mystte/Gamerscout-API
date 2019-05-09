var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./config');
var routes = require('./routes/index');
var api = require('./routes/api');
var users = require('./routes/users');
var forgot_password = require('./routes/forgot_password');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

var app = express();

var mongoOptions = {
  useNewUrlParser: true,
  autoReconnect: true,
};

var mongoConnStr = "mongodb://localhost:" + config.mongodb_port + "/" + config.project_name;
// Path to the mongodb Database. For now we use the localhost one
if (app.get('env') === 'production') {
  // Disable for now since we bind only localhost connections
  // mongoConnStr = "mongodb://" + config.mongo_user + ":" + config.mongo_pwd + "@localhost:" + config.mongodb_port + "/" + config.project_name;
  // mongoOptions.user = config.mongo_user;
  // mongoOptions.pass = config.mongo_pwd;
  // mongoOptions.dbName = config.project_name;
}

// Plug Q promises into mongoose
mongoose.Promise = require('q').Promise;

mongoose.connect(mongoConnStr, mongoOptions).then(() => {
  console.log('Successfully connected to MongoDB:' + config.project_name + ' on port ' + config.mongodb_port);
  console.log('Gamerscout is running in ' + app.get('env') + ' environment');
}, (err) => {
  throw err;
});

// Setup express sessions
var sess = {
  secret: 'gamerscoutForever',
  cookie: {},
  name: "gamerscout-api-session",
  resave: false,
  saveUninitialized: false,
  maxAge: 604800 * 1000, // 1 week
}

if (app.get('env') === 'production' || app.get('env') === 'staging') {
  console.log("* API USING REDIS STORE *");
  sess.store = new RedisStore({
    port: 6379,
    host: 'localhost'
  });
}

// if (app.get('env') === 'production') { Disabled for now
//   app.set('trust proxy', 1) // trust first proxy
//   sess.cookie.secure = true // serve secure cookies
// }

var allowCrossDomain = function(req, res, next) {
  // if (app.get('env') !== 'production') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  // }
  next();
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(allowCrossDomain);
app.disable('x-powered-by'); // disable x-power-by
// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(session(sess));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/.well-known/pki-validation/', express.static(__dirname + '/pki_validation'));

// Set env in req
app.use(function (req, res, next) {
  next();
});

// Set env in req
app.use(function(req, res, next) {
  req.env = app.get('env');
  next();
});
app.use('/', routes);
// api users routes
app.use('/api/1/users', users);
app.use('/reset', forgot_password);
// gamerscout api routes
app.use('/api/1', api);

module.exports = app;
