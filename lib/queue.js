'use strict';

var RedditRequest = require('./request');

/**
 * Creates instance of {@link Queue}.
 * @class
 * @classdesc Manages multiple requests and ensures they are sent with a time buffer between the end of a request and the start of the next. This ensures we don't go over any API rate limiting.
 * @param {Number} [request_buffer=0] - Time in milliseconds to wait between the end of a request and the start of the next.
 */
function Queue(request_buffer) {

  /**
   * The request currently being processed.
   * @type {?RedditRequest}
   * @default null
   */
  this.current = null;

  /**
   * Queue of waiting requests.
   * @type {Array.<RedditRequest>}
   * @default []
   */
  this.requests = [];

  /**
   * Time in milliseconds to wait between the end of a request and the start of the next.
   * @type {Number}
   * @default 0
   */
  this.request_buffer = request_buffer || 0;

  /**
   * Epoch time (in milliseconds) of the last completed request.
   * @type {Number}
   * @default 0
   */
  this.last_request_time = 0;

  /**
   * Timeout ID of the currently running wait timer.
   * @type {?Number}
   * @default null
   */
  this.timer = null;

}

Queue.prototype = {

  constructor: Queue,

  /**
   * Add a request to the queue and attempt to process it immediately if the queue is empty.
   * @param {RedditRequest} request - Request to add to the queue
   * @throws Fails if request is not an instance of {@link RedditRequest}
   * @throws Fails if request has callback not of type function
   */
  add: function Queue__add(request) {

    if (!(request instanceof RedditRequest)) {
      throw 'Invalid request: ' + request;
    }
    if (request.callback && typeof request.callback !== 'function') {
      throw 'Invalid request callback: ' + request.callback;
    }
    this.requests.push(request);
    this.next();

  },

  /**
   * Current epoch time in milliseconds.
   * @return {Number}
   */
  now: function Queue__now() {

    return (new Date()).getTime();

  },

  /**
   * Attempt to process the next request in the queue. Will only proceed if there are no requests currently being processed, if the time elapsed since the last completed request is greater than the request_buffer and if the queue is not empty.
   */
  next: function Queue__next() {

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

  /**
   * Sleep for specified time (in milliseconds) then invoke callback. If already sleeping, then clears previous timer before creating a new timer.
   * @param {Number} time - Time in milliseconds to sleep
   * @param {Function} callback - Callback to invoke
   */
  setTimer: function Queue__setTimer(time, callback) {

    this.clearTimer();

    var that = this;
    this.timer = setTimeout(function () {

      that.timer = null;
      callback();

    }, time);

  },

  /**
   * Clear a sleep timer if one is defined.
   */
  clearTimer: function Queue__clearTimer() {

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;

  },

  /**
   * Clear the current timer, currently processed request and remaining request queue.
   */
  kill: function Queue__kill() {

    this.clearTimer();
    this.requests = [];
    this.current = null;

  }

};

module.exports = Queue;
