

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

var schema = new mongoose.Schema({ original_url: {type: String, required: true}, short_url: Number});
var URL = mongoose.model('URL', schema);

var createAndSaveURL = function(done) {
  const urlShortened = new URL({original_url:'www.google.com', short_url: 1});
  urlShortened.save(function (err, data) {
    if (err) return done(err);
    done(null, data);
  });
};

var createAndSaveManyURL = function(arrayOfURLs, done) {
    
    URL.create(arrayOfURLs, function(err,data){
      if(err) return done(err);
      done(null, data);
    });
    
};

var findURLByOriginal = function(urlDefault, done) {
  
  URL.findOne({original_url: urlDefault}, function(err,data){
      if(err) return done(err);
      done(null, data);
  });
    
};

var findURLByShortener = function(urlShortener, done) {
  
  URL.findOne({short_url: urlShortener}, function(err,data){
      if(err) return done(err);
      done(null, data);
  });
    
};


var findMaxShortenedURL = function(done) {
  // Find the max shortened url of all db URLs
  URL.aggregate()
    .group({ _id: null, maxShortener: { $max: '$short_url' }})
    .exec(function (err, res) {
      if (err) return done(err);
      done(null, res);
    });
};




//export the functions
exports.URL = URL;
exports.createAndSaveURL = createAndSaveURL;
exports.createAndSaveManyURL = createAndSaveManyURL;
exports.findURLByOriginal = findURLByOriginal;
exports.findURLByShortener = findURLByShortener;
exports.findMaxShortenedURL = findMaxShortenedURL;