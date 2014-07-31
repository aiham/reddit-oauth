var Queue = function (request_buffer) {

  this.current = null;
  this.requests = [];
  this.request_buffer = request_buffer || 0;
  this.last_request_time = 0;
  this.timer = null;

};

Queue.prototype = {

  constructor: Queue,

  add: function (request) {

    if (typeof request !== 'object') {
      throw 'Invalid request: ' + request;
    }
    if (request.callback && typeof request.callback !== 'function') {
      throw 'Invalid request callback: ' + request.callback;
    }
    this.requests.push(request);
    this.next();

  },

  now: function () {

    return (new Date()).getTime();

  },

  next: function () {

    if (this.current || this.requests.length < 1) {
      return;
    }

    var now = this.now();
    var buffer = this.last_request_time + this.request_buffer;
    if (now < buffer) {
      this.setTimer(buffer - now, (function (queue) {

        return function () {

          queue.next();

        };

      })(this));
      return;
    }

    this.current = this.requests.shift();
    this.current.send((function (queue) {

      return function (error, response, body) {

        var request = queue.current;
        queue.current = null;
        queue.last_request_time = queue.now();
        if (request && request.callback) {
          request.callback(error, response, body);
        }
        queue.next();

      };

    })(this));

  },

  setTimer: function (time, callback) {

    this.clearTimer();
    this.timer = setTimeout(callback, time);

  },

  clearTimer: function () {

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;

  },

  kill: function () {

    this.clearTimer();
    this.requests = [];
    this.current = null;

  }

};

module.exports = Queue;
