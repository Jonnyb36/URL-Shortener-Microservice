'use strict';

var express = require('express');
var app = express();
try{
  var mongoose = require('mongoose');
} catch (e) {
  console.log(e);
}
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var router = express.Router();

const dns = require('dns');

var enableCORS = function(req, res, next) {
  if (!process.env.DISABLE_XORIGIN) {
    var allowedOrigins = ['https://marsh-glazer.gomix.me','https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin;
    if(!process.env.XORIGIN_RESTRICT || allowedOrigins.indexOf(origin) > -1) {
      console.log(req.method);
      res.set({
        "Access-Control-Allow-Origin" : origin,
        "Access-Control-Allow-Methods" : "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"
      });
    }
  }
  next();
};

// Basic Configuration 
var port = process.env.PORT || 3000;

// global setting for safety timeouts to handle possible
var timeout = 10000;

app.use(bodyParser.urlencoded({extended: 'false'}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

router.get('/file/*?', function(req, res, next) {
  if(req.params[0] === '.env') { return next({status: 401, message: 'ACCESS DENIED'}) }
  fs.readFile(path.join(__dirname, req.params[0]), function(err, data){
    if(err) { return next(err) }
    res.type('txt').send(data.toString());
  });
});

app.get('/is-mongoose-ok', function(req, res) {
  if (mongoose) {
    res.json({isMongooseOk: !!mongoose.connection.readyState})
  } else {
    res.json({isMongooseOk: false})
  }
});

var URL = require('./myApp.js').URL;

router.post('/mongoose-model', function(req, res, next) {
  // try to create a new instance based on their model
  // verify it's correctly defined in some way
  var p;
  p = new URL(req.body);
  res.json(p);
});

var createURLShortener = require('./myApp.js').createAndSaveURL;
router.post('/create-and-save-url', function(req, res, next) {
  // in case of incorrect function use wait timeout then respond
  var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
  createURLShortener(function(err, data) {
    clearTimeout(t);
    if(err) { return (next(err)); }
    if(!data) {
      console.log('Missing `done()` argument');
      return next({message: 'Missing callback argument'});
    }
     URL.findById(data._id, function(err, url) {
       if(err) { return (next(err)); }
       res.json(url);
       url.remove();
     });
  });
});

var createAndSaveManyURL = require('./myApp.js').createAndSaveManyURL;
router.post('/create-and-save-many-url', function(req, res, next) {
  URL.remove({}, function(err) {
    if(err) { return (next(err)); }
    
    // in case of incorrect function use wait timeout then respond
    var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
    createAndSaveManyURL(req.body, function(err, data) {
      clearTimeout(t);
      if(err) { return (next(err)); }
      if(!data) {
        console.log('Missing `done()` argument');
        return next({message: 'Missing callback argument'});
      }
      URL.find({}, function(err, pers){
         if(err) { return (next(err)); }
         res.json(pers);
         //URL.remove().exec(); //removes whole collection from db
       });
    });
  });
});



var findURLByOriginal = require('./myApp.js').findURLByOriginal;
router.post('/find-one-by-URL', function(req, res, next) {
  var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
  var p = new URL(req.body);
  p.save(function(err, pers) {
    if(err) { return next(err) }
    findURLByOriginal(pers.original_url, function(err, data) {
      clearTimeout(t);
      if(err) { return next(err) }
      if(!data) {
        console.log('Missing `done()` argument');
        return next({message: 'Missing callback argument'});
      }
      res.json(data);
      p.remove();
    });
  });
});




var findMaxShortenedURL = require('./myApp.js').findMaxShortenedURL;
router.post('/find-max-shortened-url-number', function(req, res, next) {
  // in case of incorrect function use wait timeout then respond
  var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
  findMaxShortenedURL(function(err, data) {
    clearTimeout(t);
    if(err) { return (next(err)); }
    if(!data) {
      console.log('Missing `done()` argument');
      return next({message: 'Missing callback argument'});
    }
    console.log(data[0]);
    res.json({maxShortener: data[0].maxShortener});
    //return data[0];
  });
});


var findURLByShortener = require('./myApp.js').findURLByShortener;
router.post('/find-max-shortened-url-number-and-return-entry', function(req, res, next) {
  // in case of incorrect function use wait timeout then respond
  var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
  findMaxShortenedURL(function(err, data) {
    clearTimeout(t);
    if(err) { return (next(err)); }
    if(!data) {
      console.log('Missing `done()` argument');
      return next({message: 'Missing callback argument'});
    }
    
    var p = new URL({original_url: "finderOnly", short_url: data[0].maxShortener});
    p.save(function(err, pers) {
      if(err) { return next(err) }
      findURLByShortener(pers.short_url, function(err, data) {
        clearTimeout(t);
        if(err) { return next(err) }
        if(!data) {
          console.log('Missing `done()` argument');
          return next({message: 'Missing callback argument'});
        }
        res.json(data);
        p.remove();
      });
    });
  });
});

//create a new url shortener
app.post("/api/shorturl/new", function(req, res, next) {
  //check whether the shortener already exists
  var t = setTimeout(() => { next({message: 'timeout'}) }, timeout);
  findURLByOriginal(req.body.url, function(err1, data) {
    clearTimeout(t);
    if(err1) { return next(err1) }
    //if the shortener doesnt already exist then create a new entry
    let hostAdd;
    if(!data){
      //check whether the webaddress is working
      const fullURL = req.body.url;
      var urlRegex = /https{0,1}:\/\//gi;
      hostAdd = fullURL.replace(urlRegex, '');

      dns.lookup(hostAdd, (err, address, family) => {
        console.log('address: %j family: IPv%s', address, family);
        if(!address){
          res.json({"error":"invalid URL"})
        } else {
          //web address is fine so find the max existing shortened number and add 1 for the new shortener
          let currMax;
          findMaxShortenedURL(function(err2, newData) {
            if(err2) { return (next(err2)); }
            console.log(newData)
            if(!newData) {
              console.log('Missing `done()` argument');
              return next({message: 'Missing callback argument'});
            }
            currMax = newData[0].maxShortener;

            var newUrl = new URL({original_url: fullURL, short_url: currMax + 1});
            newUrl.save(function(err3, url) {
              if(err3) { return next(err3) }
              res.json({original_url: url.original_url, short_url: url.short_url});  
            })
          })
        }
      });
    } else { 
      //shortened url already exists - return the info to the user
      res.json({original_url: data.original_url, short_url: data.short_url}); 
    };
  });
})

//redirect the user to original url when valid shortener used
app.get("/api/shorturl/:short_url", function(req, res, next){
  const shortUrl = req.params.short_url;
  
  findURLByShortener(shortUrl, function(err, data) {
        if(err) { return next(err) }
        if(!data) {
          console.log('Missing `done()` argument');
          return next({message: 'This shortener does not exist, please add via form.'});
        }
        res.redirect(data.original_url);
      });
})



app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//check if valid website
//dns.lookup(host, cb)

app.use('/_api', enableCORS, router);

// Error handler
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }
});

// Unmatched routes handler
app.use(function(req, res){
  if(req.method.toLowerCase() === 'options') {
    res.end();
  } else {
    res.status(404).type('txt').send('Not Found');
  }
})

var listener = app.listen(process.env.PORT || 3000 , function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

