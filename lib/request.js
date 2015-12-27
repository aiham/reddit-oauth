var request = require('request');

var RedditRequest = function (options, callback) {

  this.options = options;
  this.callback = callback;

};

RedditRequest.prototype = {

  constructor: RedditRequest,

  send: function (callback) {

    request(this.options, callback);

  }

};

module.exports = RedditRequest;
