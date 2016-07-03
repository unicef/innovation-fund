var express      = require('express');
var app          = express();

var apicache     = require('apicache').options({ debug: true }).middleware;
var request_json = require('request-json');
var client       = request_json.createClient('http://www.unicefstories.org/');

app.use(express.static(__dirname + '/app'));                 // set the static files location /public/img will be /img for users
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// app.get('/stories', function(req, res){
app.get("/stories", apicache('5 days'), function(req, res){
  client.get('category/youth-engagement/?json=1', function(err, xxx, body) {
    console.log(body.posts);
    res.json(body.posts.slice(0,6));
  })
})


app.listen(process.env.PORT || 3002);
