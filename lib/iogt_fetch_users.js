var q         = require('q')
var google    = require('googleapis')
var analytics = google.analytics('v3');
var key       = require('../Innovation-8c7539d6835d.json')

// var sites     = new Firebase('https://iogt3.firebaseio.com/sites');
var jwtClient = new google.auth.JWT(key.client_email, null,key.private_key, ['https://www.googleapis.com/auth/analytics.readonly']);

function strip_out_needless(json){
  slimmed = {}
  if (!!json.rows){
    slimmed.rows = json.rows
  }
  if (!!json.totalsForAllResults){
    slimmed.totalsForAllResults = json.totalsForAllResults
  }
  return slimmed
}

function yyyymmdd_2_mmddyyyy(date_str){
  ymd = date_str.split(/-/)

  return ymd[1] + "/" + ymd[2] + "/" + ymd[0]
}

Date.prototype.formatYYYYMMDD = function(){
    return this.getFullYear() +
    "-" +  ("0" + (this.getMonth() + 1)).slice(-2) +
    "-" +  ("0" + this.getDate()).slice(-2);
}
var _this = this;
exports.with_dimension = function (db, ref, name, ga_id, date, metric, dimension, is_first_time, sites, def){

  if(is_first_time == 0)
    date = get_last_month_for_site(name, sites, 'users', date)

  if(!def){
    def = q.defer()
  }
  console.log(date, "....");
  var firstDay = new Date(date.getFullYear(), date.getMonth(), 1).formatYYYYMMDD();
  var lastDay  = new Date(date.getFullYear(), date.getMonth() + 1, 0).formatYYYYMMDD();

  console.log('fetching: ' + firstDay + " "  + lastDay + name + " " + dimension)

  jwtClient.authorize(function(err, tokens) {
    if (err) {
      console.log(err);
      return;
    }

    // Make an authorized request to list analytics files.
    // list of dimensions and metrics : https://developers.google.com/analytics/devguides/reporting/core/dimsmets
    analytics.data.ga.get({
      auth: jwtClient,
      "ids":'ga:' + ga_id,
      "start-date":firstDay,
      "sort":"-ga:" + metric + ",ga:" + dimension,
      "end-date":lastDay,
      "metrics": "ga:" + metric,
      "dimensions": "ga:" + dimension,
      }, function(err, result) {
        if(!err){
          // Old firebase version
          // var monthsRef = new Firebase('https://iogt3.firebaseio.com/' + dimension + '/' + name + '/months/' + firstDay + '/' + metric);

          var monthsRef = db.ref(ref + dimension + '/' + name + '/months/' + firstDay + '/' + metric)
          monthsRef.set({
            value: strip_out_needless(result),
          });
          // If current month is earlier that today's month
          // then get next month
          if(parseInt(firstDay.replace(/-/g,'').substr(0,6)) < parseInt(new Date().formatYYYYMMDD().replace(/-/g,'').substr(0,6))){
            current_date  = new Date(yyyymmdd_2_mmddyyyy(firstDay))
            next_date = new Date(current_date.setMonth( current_date.getMonth( ) + 1 ))
            setTimeout(function(){_this.with_dimension(db, ref, name, ga_id, next_date, metric, dimension, 1, sites, def)}, 1000)

          }else{
            // All months to date have been recorded
            // Go to the next website name
            setTimeout(function(){def.resolve()}, 1000);
          }

        }else{
          console.log(err)
        }
      }
    );
  })
  return def.promise;
}

function get_last_month_for_site(name, sites, kind, date){
  if(!!sites && !!sites[kind] && !!sites[kind][name] && !!sites[kind][name]['months']){
    months    = Object.keys(sites[kind][name]['months']).sort()
    last_date = new Date(months[months.length-1])
    last_date.setDate(last_date.getDate() + 1);
    return last_date
  }else{
    return date
  }
}

// db is firebase
users_info = function (db, ref, name, ga_id, date, kind, is_first_time, sites, def){
  if(is_first_time == 0)
    date = get_last_month_for_site(name, sites, 'users', date)

  def = !!def ? def : q.defer()

  var firstDay = new Date(date.getFullYear(), date.getMonth(), 1).formatYYYYMMDD();
  var lastDay  = new Date(date.getFullYear(), date.getMonth() + 1, 0).formatYYYYMMDD();
  console.log('fetching: ' + firstDay + " "  + lastDay + " " +  name + " " + kind)

  jwtClient.authorize(function(err, tokens) {
    if (err) {
      console.log(err);
      return;
    }
    // Make an authorized request to list analytics files.
    // list of dimensions and metrics : https://developers.google.com/analytics/devguides/reporting/core/dimsmets
    analytics.data.ga.get(
      {
        auth: jwtClient,
        "ids":'ga:' + ga_id,
        "sort":"-ga:" + kind,
        "start-date":firstDay,
        "end-date":lastDay,
        "metrics": "ga:" + kind
      },
      function(err, result) {
        if(!err){
          // var monthsRef = new Firebase('https://iogt3.firebaseio.com/' + kind + '/' + name + '/months/' + firstDay);
          var monthsRef = db.ref(ref + kind + '/' + name + '/months/' + firstDay)
          monthsRef.set({
            value: strip_out_needless(result),
          });

          // If current month is earlier that today's month
          // then get next month
          if(parseInt(firstDay.replace(/-/g,'').substr(0,6)) < parseInt(new Date().formatYYYYMMDD().replace(/-/g,'').substr(0,6))){
            current_date  = new Date(yyyymmdd_2_mmddyyyy(firstDay))
            next_date = new Date(current_date.setMonth( current_date.getMonth( ) + 1 ))
            setTimeout(function(){users_info(db, ref, name, ga_id, next_date, kind, 1, sites, def)}, 1000)

          }else{
            // All months to date have been recorded
            // Go to the next website name

            setTimeout(function(){def.resolve()}, 1000);
            return
          }

        }else{
          console.log(err)
        }
      }
    )
  })
  return def.promise;
}

exports.users_language = function (db, ref, name, ga_id, date, kind, dimension){
  def = q.defer();
  var firstDay = new Date(date.getFullYear(), date.getMonth(), 1).formatYYYYMMDD();
  //var lastDay  = new Date(date.getFullYear(), date.getMonth() + 1, 0).formatYYYYMMDD();
  var lastDay  = new Date().formatYYYYMMDD();


  console.log('fetching: ' + firstDay + " "  + lastDay + name + " " + kind + " " + dimension)

  jwtClient.authorize(function(err, tokens) {
    if (err) {
      console.log(err);
      return;
    }

    // Make an authorized request to list analytics files.
    // list of dimensions and metrics : https://developers.google.com/analytics/devguides/reporting/core/dimsmets
    analytics.data.ga.get({
      auth: jwtClient,
      "ids":'ga:' + ga_id,
      "start-date":firstDay,
      "sort":"-ga:" + kind + ",ga:" + dimension,
      "end-date": new Date().formatYYYYMMDD(),
      "metrics": "ga:" + kind,
      "dimensions": "ga:" + dimension,
      },
      function(err, result) {

        if(!err){
            // var monthsRef = new Firebase('https://iogt3.firebaseio.com/' + dimension + '/' + name);
            var monthsRef = db.ref(ref + dimension + '/' + name)
            monthsRef.set({
              value: strip_out_needless(result),
            });

            setTimeout(function(){def.resolve()}, 1000);
            return
        }else{
          console.log(err)
        }
      }
    )
  })
  return def.promise;
}


exports.users_info = users_info
