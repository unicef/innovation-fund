var config       = require('./config'); // get our config file
var writeJson    = require('write-json');
var jsonfile     = require('jsonfile')
var rows         = null
var Spreadsheet  = require('edit-google-spreadsheet');
var fs           = require('fs'), json;
var firebase = require('firebase');
var Firebase     = require('firebase');
var fb_config = require('./firebase_service_account')
// Initialize the app with a custom auth variable, limiting the server's access
firebase.initializeApp({
  serviceAccount: fb_config,
  databaseURL: 'https://innovation-fund2.firebaseio.com'
});

var db = firebase.database();

var mainRef = db.ref('/')
var refForm = db.ref('form');
var refGit = db.ref('git');
var refUReportGet = db.ref('ureport_all'); //All ureport orgs
var refUReport = db.ref('ureport'); // Storing fund orgs
var refIOGT = db.ref('iogt');
var refBudget = db.ref('budget');
var refProjects = db.ref('projects')
var refPortfolios = db.ref('portfolios')
var refSummary = db.ref('summary')
var refContent = db.ref('content')
var q            = require('q');
var request = require('request');

function handle_undefined(item){
  return !!item ? item : 'total'
}

// For splitting projects into groups of three : name, country, amount
function chunk(arr, n) {
  return arr.reduce(function(p, cur, i) {
      (p[i/n|0] = p[i/n|0] || []).push(cur);
      return p;
  },[]);
}

function get_spreadsheet_data(kind, spread_id, work_id){
  var def = q.defer()

  Spreadsheet.load({
    debug: true,
    spreadsheetId: spread_id,
    worksheetId: work_id,
    oauth2: {
      client_id:     process.env.client_id     || config.oauth2.client_id,
      client_secret: process.env.client_secret || config.oauth2.client_secret,
      refresh_token: process.env.refresh_token || config.oauth2.refresh_token
      }
    }, function sheetReady(err, spreadsheet) {

    if(err) throw err;

    spreadsheet.receive({ getValues: true }, function(err, rows, info) {

      if(err) throw err;

      // rows = Object.keys(rows).map(function(e){ar = []; return Object.keys(rows[e]).forEach(function(k){ return ar[k] = rows[e][k]})})
      arry = [];
      Object.keys(rows).forEach(function(e){
        ary = [];
        Object.keys(rows[e]).forEach(function(k){
          ary[k-1] = rows[e][k];
        });
        arry.push(ary);
      })
      writeJson.sync('./public/' + kind + '.json', arry);
      def.resolve();

    });
  });
  return def.promise;
}

// This fetches data from google worksheets
// and stores it in json files in the public dir
exports.refresh = function(callback){
  get_spreadsheet_data(
    'budget',
     process.env.spreadsheetID ||
    config.budget_spreadsheetId,
    process.env.budget_tracking ||
    config.budget_worksheetId )
  // Need to get this from the project pages in the future
  .then(function(){return get_spreadsheet_data(
    'form',
    process.env.spreadsheetID ||
    config.project_spreadsheetId,
    process.env.project_form_id ||
    config.project_worksheetId
  )})
  .then(function(){return get_spreadsheet_data(
    'youth_engagement',
    process.env.projects_spreadsheetId ||
    config.projects_spreadsheetId,
    process.env.youth_engagement_worksheetId ||
    config.youth_engagement_worksheetId
  )})
  .then(function(){return get_spreadsheet_data(
    'real_time_information',
    process.env.projects_spreadsheetId ||
    config.projects_spreadsheetId,
    process.env.real_time_information_worksheetId ||
    config.real_time_information_worksheetId
  )})
  .then(function(){return get_spreadsheet_data(
    'infrastructure',
    process.env.projects_spreadsheetId ||
    config.projects_spreadsheetId,
    process.env.infrastructure_worksheetId ||
    config.infrastructure_worksheetId
  )})
  .then(function(){return get_spreadsheet_data(
    'knowledge_products',
    process.env.projects_spreadsheetId ||
    config.projects_spreadsheetId,
    process.env.knowledge_products_worksheetId ||
    config.knowledge_products_worksheetId
  )})
  .then(function(){return get_spreadsheet_data(
    'content',
    process.env.portfolio_content_spreadsheetId ||
    config.portfolio_content_spreadsheetId,
    process.env.portfolio_content_worksheetId ||
    config.portfolio_content_worksheetId
  )})

  .then(function(){return callback()})
}

function array2hash(ary){
  hash = {}
  ary.forEach(function(e){
    hash[e[0]] = e[1]
  })
  return hash
}

exports.get_git_commits = function(gits){
  all_promises = []
  gits.forEach(function(g){
    // [ 'rapidpro_immu', 'praekelt/casepro,rapidpro/casepro' ]
    g[1].split(',').forEach(function(repo){
      var options = {
        url: 'https://api.github.com/repos/' + repo + '/stats/commit_activity',
        headers: {
          'User-Agent': 'request'
        }
      };
      all_promises.push(
        new Promise(function(resolve, reject){
          request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              var commits = JSON.parse(body);
              db.ref('/git/' + g[0] + '/' + repo).set({
                commits,
              }, function(err, res2){
                resolve();
              });
            }
          })
        })
      )
    })
  })


  Promise.all(all_promises).then(function(values) {
    return Promise.resolve();
  });
}


function get_financials(kind, obj){
  var re = new RegExp(kind,'g');
  return obj.filter(function(e){
    return !!e[0] && e[0].match(re)
  })[0]
  .map(function(e){
    return String(e)
  }).filter(function(e){
    return !!e && !e.match(/[A-Za-z]/)
  }).map(function(e, i){
    return [handle_undefined(portfolios[i]), parseInt(e.replace(/,/g, ''))]
  })
}


// This is where we'll probably store projects, i.e. not in the form page.
exports.get_projects2 = function(portfolio, gits){
  var projects = [];
  var projects_hash = {}
  var def = q.defer()

  jsonfile.readFile(__dirname + '/public/' + portfolio + '.json', function(err, obj) {

    if (!!obj){
      slug_index = obj[0].findIndex(function(e){return e.match(/slug/i)});
      country_index = obj[0].findIndex(function(e){return e.match(/country/i)});
      name_index = obj[0].findIndex(function(e){return e.match(/title/i)});
      description_index = obj[0].findIndex(function(e){return e.match(/description/i)});
      amount_index = obj[0].findIndex(function(e){return e.match(/amount/i)});
      github_index = obj[0].findIndex(function(e){return e.match(/github/i)});
      portfolio_index = obj[0].findIndex(function(e){return e.match(/portfolio/i)});
      link_href_index = obj[0].findIndex(function(e){return e.match(/link_href/i)});
      link_text_index = obj[0].findIndex(function(e){return e.match(/link_text/i)});
      portfolios = [];
      obj.shift();

      obj.forEach(function(line){
        if(line[amount_index]){

          var project = {
            country: line[country_index] ||  '',
            slug: line[slug_index] || '',
            name: line[name_index] ||  '',
            amount: line[amount_index] ||  '',
            description: line[description_index] || '',
            github: line[github_index] ||  '',
            link_href: line[link_href_index] || '',
            link_text: line[link_text_index] || ''
          }

          projects_hash[line[slug_index]] = project;

          projects.push(project);
          if(line[github_index]){
            gits.push([line[slug_index], line[github_index]])
          }
        }
      });

      // Save projects as array
      // Also save projects as hash for featured projects
      db.ref('portfolios/' + portfolio).set({
        projects,
      }, function(err, res2){
        db.ref('portfolio_projects/' + portfolio).set({
          projects_hash,
        }, function(err, res2){
          def.resolve(gits)
        });
      });
    }

  })
  return def.promise;
}

exports.get_portfolios_summary = function(){
    var def = q.defer()
    jsonfile.readFile(__dirname + '/public/dashboard.json', function(err, obj) {
      if (!!obj){
        var labels = obj.shift();
        labels.shift();

        total_index = labels.findIndex(function(e){return e.match(/total/i)});
        // index_youth_engagement = labels.findIndex(function(e){return e.match(/youth_engagement/i)});
        // index_real_time_data = labels.findIndex(function(e){return e.match(/real_time_data/i)});
        // index_infrastructure = labels.findIndex(function(e){return e.match(/infrastructure/i)});
        // index_technical_assistance = labels.findIndex(function(e){return e.match(/technical_assistance/i)});
        // index_fund_management = labels.findIndex(function(e){return e.match(/fund_management/i)});
        // index_knowledge_products = labels.findIndex(function(e){return e.match(/knowledge_products/i)});
        index_co_funding = labels.findIndex(function(e){return e.match(/co_funding/i)});

        var availables = obj[0];
        var investeds = obj[1];
        var remains = obj[2];
        var num_projects = obj[3][1];
        var num_countries = obj[4][1];
        var invested_youth_engagement = investeds[2];
        // var invested_real_time_data = investeds[3]
        // var invested_infrastructure = investeds[4]
        // var invested_technical_assistance = investeds[5]
        // var invested_fund_management = investeds[6]
        // var invested_knowledge_products = investeds[7]
        var total_available = availables[total_index+1];
        var co_funding = remains[index_co_funding+1];

        refSummary.set(
          {
            stats:{
              total_available: total_available,
              co_funding: co_funding,
              total_invested: investeds[1],
              num_projects: num_projects,
              num_countries: num_countries
            },
            portfolios:{
              invested_youth_engagement: {
                amount: investeds[2],
                label: 'Products for youth',
                color: '#ffcc33'
              },
              invested_real_time_information: {
                amount: investeds[3],
                label: 'Real-time Information',
                color: '#ff3366'
              },
              invested_infrastructure:{
                amount: investeds[4],
                label: 'Infrastructure',
                color: '#66cc66'
              },
              invested_technical_assistance:{
                amount: investeds[5],
                label: 'Technical Assistance',
                color: '#555555'
              },
              invested_fund_management:{
                amount: investeds[6],
                label: 'Fund management',
                color: '#b1b1b1'
              },
              invested_knowledge_products:{
                amount: investeds[7],
                label: 'Knowledge products',
                color: 'teal'
              },
            }
          }, function(err, res2){
          def.resolve()
        });

      }else{

        def.resolve()
        // res.json([])
      }
    })
    return def.promise;
  }
exports.get_budget = function(){
  var def = q.defer()
  jsonfile.readFile(__dirname + '/public/budget.json', function(err, obj) {
    if (!!obj){
      spents = {};
      totals = {};
      obj.shift()
      obj.forEach(function(e){
        if(e[2]){
          totals[e[0]] = parseInt(e[1].replace(/,/g, ''));
          spents[e[0]] = parseInt(e[2].replace(/,/g, ''));
        }
      })
      refBudget.set({totals: totals, spents: spents}, function(err, res2){
        // res.json({'totals': array2hash(totals), 'spents': array2hash(spents)})
        def.resolve()
      });


      // portfolios = obj[0].filter(function(e){
      //   return !!e
      // }).map(function(e){
      //   return e.replace(/portfolio\s+\d+:\s+/i, '')
      //   .replace(/admin/i, 'fund_management')
      //   .replace(/\s+/g, '_').toLowerCase();
      // })
      // totals = get_financials('Total income', obj)
      // spents = get_financials('TOTAL SPENT', obj)
      // budgetRef.set({totals: array2hash(totals), spents: array2hash(spents)}, function(err, res2){
      //   // res.json({'totals': array2hash(totals), 'spents': array2hash(spents)})
      //   def.resolve()
      // });
    }else{

      def.resolve()
      // res.json([])
    }
  })
  return def.promise;
}

exports.get_content = function(gits){
  var def = q.defer()
  jsonfile.readFile(__dirname + '/public/content.json', function(err, obj) {
    refContent.set(
      obj.reduce(function(hash, elem, index){
        hash[elem[0]] = elem[1]
        return hash
      }, {})
    , function(err, res2){
      def.resolve(gits)
    });
  })
  return def.promise;
}

exports.get_cofunding = function(){
  var def = q.defer()
  jsonfile.readFile(__dirname + '/public/form.json', function(err, obj) {
    if (!!obj){
      total_cofunding = 0
      total_released  = 0
      num_projects    = 0
      countries       = {}
      cofunding_index = obj[0].findIndex(function(e){return e.match(/amount of co-funding/)})
      countries_index = obj[0].findIndex(function(e){return e.match(/^Country/)})
      released_index  = obj[0].findIndex(function(e){return e.match(/^Amount invested/)})

      obj.forEach(function(r, i){
        if(i > 0){
            countries[r[countries_index]] = !!countries[r[countries_index]] ? (countries[r[countries_index]]) + 1 : 1
        }

        if(isNaN(r[cofunding_index])){
          if(r[cofunding_index].match(/\d/)){
           total_cofunding += parseInt(String(r[cofunding_index]).replace(/\D/g,''))
          }
        }

        if(isNaN(r[released_index])){
          if(!!r[released_index]){
            if(r[released_index].match(/\d/)){
             num_projects   += 1
             total_released += parseInt(String(r[released_index]).replace(/\D/g,''))
            }

          }
        }
      })

      refForm.set({
        cofunding: total_cofunding,
        released:  total_released,
        countries: countries,
        projects:  num_projects
      }, function(err, res2){
        def.resolve()
      });
    }else{
      def.resolve()
    }
  })
  return def.promise;
}

function formatDate(d){
  var parts = d.split(/\//);
  return '20' + parts[2] + '-' + parts[0];
}

function getMonths(orgs, countries){
  var months = {};
  Object.keys(orgs).forEach(function(k, i){
    Object.keys(orgs[k].registration_stats).forEach(function(k2){
      if(countries.indexOf(k) > -1){
        label         = formatDate(orgs[k].registration_stats[k2].label);
        months[label] = 1;
      }
    })
  })
  return months
}

exports.get_iogt = function(){
  console.log('IOGT');
  var def = q.defer()
  firebase.database().ref('iogt_all/users').once('value').then(function(snapshot) {
    users = snapshot.val()
    months  = {}
    Object.keys(users).forEach(
      function(c){
        Object.keys(users[c].months).forEach(
          function(m){
            months[m]  = 0
          }
        )
      }
    );

    Object.keys(users).forEach(
      function(c){
        Object.keys(users[c].months).forEach(
          function(m){
            months[m] = months[m] + parseInt(users[c].months[m].value.totalsForAllResults['ga:users'])
          }
        )
      }
    );

    dataSet = Object.keys(months).sort().map(function(e){return [e.substr(0,7),  parseInt(months[e]/1000)]})

    refIOGT.set(dataSet, function(err, res2){
      def.resolve()
    });

    def.resolve()
    // handle read data.
  });
  return def.promise;
}

exports.get_ureport = function(){
  var projects  = require('./public/youth_engagement.json')
  var def = q.defer()
  firebase.database().ref('ureport_all').once('value').then(function(snapshot) {
    orgs = snapshot.val().orgs

    records = {};
    countries = [];
    console.log(projects.length)
    // Only get countries in the fund
    countries = projects.filter(function(e, i){
      return e[1] && e[1].match(/u-report/i)
    }).map(function(e){
      return e[2].replace(/\s+/g,'').toLowerCase();
    })

    countries.forEach(function(country){
      var months = getMonths(orgs, [country])
      var dataSet = [];

      Object.keys(months).forEach(function(m){
        var a = [m];
        var org_sum_for_month = 0;
        Object.keys(orgs).forEach(function(o){
          if(o === country){
            orgs[o].registration_stats.forEach(function(e){
              if(m === formatDate(e.label)){

                org_sum_for_month = org_sum_for_month +  e.count;
              }
            })
          }
        })
        a.push(org_sum_for_month)
        dataSet.push(a);
      })
      records[country] = dataSet;
    })

    refUReport.set(records, function(err, res2){
      def.resolve()
    });
    def.resolve()
  });
  return def.promise;
};
