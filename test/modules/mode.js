console.log('executed mode');
module('mode', require('javascripts/d.js', function(exports) {
  exports.test = function() {
    return loadedD;
  };
}));