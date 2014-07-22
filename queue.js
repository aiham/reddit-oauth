var Queue = function (request_buffer) {

  this.current = null;
  this.requests = [];
  this.request_buffer = request_buffer;
  this.last_request_time = 0;
  this.is_scheduled = false;

};

Queue.prototype = {

  constructor: Queue,

  add: function (request) {

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
      if (!this.is_scheduled) {
        this.is_scheduled = true;
        setTimeout((function (queue) {

          queue.is_scheduled = false;
          queue.next();

        })(this), buffer - now);
      }
      return;
    }

    this.current = this.requests.shift();
    this.current.send((function (queue) {

      return function (error, response, body) {

        var request = queue.current;
        queue.current = null;
        queue.last_request_time = queue.now();
        request.callback(error, response, body);
        queue.next();

      };

    })(this));

  }

};

module.exports = Queue;
