var express = require('express');
var router = express.Router();
var fs = require('fs');
var moment = require('moment');
var f = require('../functions.js');
var loadFile = require('../loadFile.js');
var appendFile = require('../appendFile.js');
var writeFile = require('../writeFile.js');

// JSON
var bilar = './data/bilar.json';
var funktioner = './data/funktioner.json';

// Funktioner

checkIfExists = function(req, db) {
  var isItTrue;
  db.forEach(function(v, i) {
    if (db[i].regnum == req.regnum) {
      isItTrue = true;
    }
  });
  return isItTrue;
};

function objectFindByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] === value) {
            return array[i];
        }
    }
    return "no match";
}

function checkBesikt (array) {
  var besikt_bilar = [];
  array.forEach(function(v, i) {
    //dagens år, månad och dag
    var today_year = moment();
    //bilens sista siffra minus 1 månad
    var car_reg_full = array[i];
    var car_reg = car_reg_full.regnum.charAt(5) - 1;
    //bilens datum
    var car_date = moment().set({'year': (moment().get('year')), 'month': car_reg, 'date':1});
    //bilens från datum
    var car_date_from = moment(car_date).subtract(2, 'months').startOf('month');
    //bilens till datum
    var car_date_after = moment(car_date).add(2, 'months').endOf('month');
    var car_is_before =  moment(car_date).subtract(2, 'months').startOf('month');
    var car_is_after =  moment(car_date).add(2, 'months').endOf('month');
    // Om bilen snart behöver besiktigas, skicka till array som sen skickas till render
    if (car_is_before.isBefore(today_year) && car_is_after.isAfter(today_year)) {
      besikt_bilar.push(car_reg_full);
    }
  });
  return besikt_bilar;
}

var empty_car = {
  "regnum": "",
  "brand": "",
  "model": "",
  "type": "",
  "year": "",
  "passenger": "",
  "tillval": [],
  "service": "",
  "serviceDate": "",
  "lastBooked": ""
};

/* LOAD PAGE */
router.get('/', function(req, res, next) {
  loadFile(funktioner, loadNext);
  function loadNext (funkArr) {
    loadFile(bilar, doStuff);
    function doStuff (carArr) {
      res.render('fordon', {
        'funklista': funkArr,
        'bilar': empty_car,
        'besikt_bilar' : checkBesikt(carArr)
      });
    };
  };
});

/* SEARCH CAR */
router.post('/', function(req, res, next) {
  var search_text = req.body.search_text.toUpperCase();

  loadFile(bilar, loadFunk);
  function loadFunk (carArr) {
    loadFile(funktioner, doStuff);
    function doStuff (funkArr) {
      var findCar = objectFindByKey(carArr, 'regnum', search_text);
      if(search_text == findCar.regnum) {
        var ny_bil = {
          "regnum": findCar.regnum,
          "brand": findCar.brand,
          "model": findCar.model,
          "type": findCar.type,
          "year": findCar.year,
          "passenger": findCar.passenger,
          "tillval" : f.tillvalFix(findCar.tillval),
          "service": findCar.service,
          "serviceDate": findCar.serviceDate,
          "inspection": findCar.inspection,
          "inspectionDate": findCar.inspectionDate,
          "lastBooked": findCar.lastBooked
        };
      } else {
        var ny_bil = {
          "regnum": "Not found",
          "brand": "",
          "model": "",
          "type": "",
          "year": "",
          "passenger": "",
          "tillval" : [],
          "service": "",
          "serviceDate": "",
          "inspection": "",
          "inspectionDate": "",
          "lastBooked": ""
        };
      }
      res.render('fordon', {
        'bilar': ny_bil,
        'funklista': funkArr,
        'besikt_bilar': checkBesikt(carArr)
      });
      }
    };
});

/* ADD CAR */
router.post('/add', function(req, res, next) {

  loadFile(bilar, loadNext);
  function loadNext (carArr) {
    var newCar = {
      "regnum": req.body.regnum.toUpperCase(),
      "brand": req.body.brand,
      "model": req.body.model,
      "type": req.body.type,
      "year": req.body.year,
      "passenger": req.body.passenger,
      "tillval": req.body.tillval,
      "service": req.body.service,
      "serviceDate": req.body.serviceDate,
      "inspection": "",
      "inspectionDate": "",
      "lastBooked": ""
    };
    if (checkIfExists(newCar, carArr) === true) {
      loadFile(funktioner, errorPage);
      function errorPage (funkArr) {
        res.render('fordon', {
          carExists: 'En bil med regnummer "' + newCar.regnum + '" finns redan registrerad.',
          carErr: true,
          funklista: funkArr,
          bilar: empty_car,
          besikt_bilar: checkBesikt(carArr)
        });
      }
    } else {
      if (typeof newCar.tillval == 'undefined') {
        newCar.tillval = [];
      }
      if (typeof newCar.service == 'undefined') {
        newCar.service = "off";
      }
      appendFile(bilar, newCar);
      loadFile(funktioner, successPage);
      function successPage (funkArr) {
        res.render('fordon', {
          carAdded: 'Bilen med regnummer "' + newCar.regnum + '" registrerades utan problem.',
          carAdd: true,
          funklista: funkArr,
          bilar: empty_car,
          besikt_bilar: checkBesikt(carArr)
        });
      }
    }
  }
});

/* UPDATE CAR */
router.post('/update', function(req, res, next) {
  loadFile(bilar, doStuff);
  function doStuff (carArr) {
    for(i = 0; i < carArr.length; i++){
      if(carArr[i].regnum == req.body.regnum) {

        carArr[i].regnum = req.body.regnum;
        carArr[i].brand = req.body.brand;
        carArr[i].model = req.body.model;
        carArr[i].type = req.body.type;
        carArr[i].year = req.body.year;
        carArr[i].passenger = req.body.passenger;
        carArr[i].tillval  = f.tillvalFix(req.body.tillval);
        carArr[i].service = req.body.service;
        carArr[i].serviceDate = req.body.serviceDate;
        carArr[i].inspection = req.body.inspection;
        carArr[i].inspectionDate = req.body.inspectionDate;
        carArr[i].lastBooked = req.body.lastBooked;
      }
    }
    var updateCar = "";
    carArr.forEach(function(v,i){
      updateCar += JSON.stringify(carArr[i], null, "\t") + '\n*\n';
    })
    updateCar = updateCar.slice(0, -3);
    console.log(updateCar);
    writeFile(bilar, updateCar, function(){
      loadFile(funktioner, renderPage);
      function renderPage (funkArr) {
        res.render('fordon', {
          bilar: empty_car,
          funklista: funkArr,
          besikt_bilar : checkBesikt(carArr)
        });
      }
    });
  }
});


/* DELETE CAR */
router.post('/remove', function(req, res, next) {
  console.log("oooooooooooooooooooooooooo");
  console.log("Button delete is pressed");

  var inspection = './data/bilar.json';
  var besikt_bilar = [];
  var data1 = [];
  var aallArr;
  var bilar = './data/bilar.json';
  var newArr = [];
  var regnum = req.body.regnum;


  fs.readFile(bilar, function(err,data){
    if (err) throw err;
    data = data.toString();
    var arr = data.split('*');
    arr.forEach(function(v,i){
      newArr.push(JSON.parse(arr[i]));
    });
    for(i = 0; i < newArr.length; i++){
      if (newArr[i].regnum == regnum) {
        newArr.splice(i,1);
      }
    }
    send = f.stringWrite(newArr);
    fs.writeFile(bilar,send,function(err){
      if (err) throw err;
      console.log('file saved');
      // read file start
      funkArr = [];
      fs.readFile(funktioner, function(err, data) {
        if (err) throw err;
        data = data.toString();
        var arr = data.split('*');
        arr.forEach(function(v, i) {
          funkArr.push(JSON.parse(arr[i]));
        });
        fs.readFile(inspection, function(err, data) {
          if (err) throw err;
          data = data.toString();
          var arr = data.split('*');
          arr.forEach(function(v, i) {

            //dagens år, månad och dag
            var today_year = moment();
            //bilens sista siffra minus 1 månad
            var car_reg_full = JSON.parse(arr[i]);
            console.log(typeof car_reg_full);
            console.log("#######  car_reg_full");
            console.log(car_reg_full);
            var car_reg = car_reg_full.regnum.charAt(5) - 1;
            console.log("#######  car_reg");
            console.log(car_reg);
            //bilens datum
            var car_date = moment().set({'year': (moment().get('year')), 'month': car_reg, 'date':1});
            //bilens från datum
            var car_date_from = moment(car_date).subtract(2, 'months').startOf('month');
            //bilens till datum
            var car_date_after = moment(car_date).add(2, 'months').endOf('month');
            var car_is_before =  moment(car_date).subtract(2, 'months').startOf('month');
            var car_is_after =  moment(car_date).add(2, 'months').endOf('month');

            console.log("-------- today month mars");
            console.log(today_year.format('YYYY-MM-DD'));
            console.log("-------- car date");
            console.log(car_date.format('YYYY-MM-DD'));
            console.log("-------- two months before today month mars is december");
            console.log(car_date_from.format('YYYY-MM-DD'));
            console.log("-------- two months after today month mars is december");
            console.log(car_date_after.format('YYYY-MM-DD'));

            if (car_is_before.isBefore(today_year) && car_is_after.isAfter(today_year)) {
              besikt_bilar.push(car_reg_full);
              console.log("this will be shown in march");
            } else {
              console.log("sorry, not this month");
              console.log("this will not be shown in march");
            }
            /* ----------   inspection section end ------*/
          });

          res.render('fordon', {
            'bilar': ny_bil,
            'search_text': regnum,
            'funklista': funkArr,
            'besikt_bilar' : besikt_bilar
          }); // res render end

        });
      });
    });
  });
});

module.exports = router;
