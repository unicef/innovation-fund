var express      = require('express');
var app          = express();
var helper       = require('./server_helper');
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

// This fetches data from google worksheets
// and stores it in json files in the public dir
app.get("/refresh", function(req, res){
  helper.refresh(function(){
    res.json('Spreadsheet imported: ' +  new Date())
  })
});


// This open json files in public dir
// and saves data to firebase
app.get("/stats", function(req, res){
  gits = [];
  helper.get_content()
  .then(function(){return helper.get_projects2('youth_engagement', gits)})
  .then(function(){return helper.get_projects2('real_time_information', gits)})
  .then(function(){return helper.get_projects2('infrastructure', gits)})
  .then(function(){return helper.get_projects2('knowledge_products', gits)})
  .then(function(gits){return helper.get_git_commits(gits)})
  .then(function(){return helper.get_cofunding()}) // Still getting this from actual form
  .then(function(){return helper.get_ureport()})
  .then(function(){return helper.get_iogt()})
  .then(function(){return helper.get_budget()})
  .then(function(){return res.json([])})
});

app.listen(process.env.PORT || 3002);
