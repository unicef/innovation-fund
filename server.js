var express      = require('express');
var app          = express();

var apicache  = require('apicache');
var cache     = apicache.middleware;
var request_json = require('request-json');
var client       = request_json.createClient('http://www.unicefstories.org/');

app.use(express.static(__dirname + '/app'));                 // set the static files location /public/img will be /img for users
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// app.get('/stories', function(req, res){
app.get('/stories', cache('1 hour'), function(req, res, next) {
  client.get('category/youth-engagement/?json=1', function(err, xxx, body) {
    if (err || !body) {
      apicache.clear();
      return res.json([]);
    }
    if (Array.isArray(body.posts)) {
      res.json(body.posts.slice(0,6));
    } else{
      apicache.clear();
      return res.json([]);
    }
  });
});


app.listen(process.env.PORT || 3002);
