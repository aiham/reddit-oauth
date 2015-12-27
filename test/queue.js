'use strict';

var assert = require('assert');
var Queue = require('../lib/queue');

describe('Queue', function () {
  var TestRequest = function (callback, error, response, body) {

    this.callback = callback;
    this.error = error;
    this.response = response;
    this.body = body;

  };
  TestRequest.processTime = 500;
  TestRequest.prototype = {

    constructor: TestRequest,

    send: function (callback) {

      var that = this;
      setTimeout(function () {

        callback(that.error, that.response, that.body);

      }, TestRequest.processTime);

    }

  };

  describe('new Queue()', function () {
    it('should initialise the object successfully', function () {

      assert.doesNotThrow(function () {
        var queue = new Queue();
        assert.strictEqual(queue.request_buffer, 0);
      });

      assert.doesNotThrow(function () {
        var queue = new Queue(1000);
        assert.strictEqual(queue.current, null);
        assert.ok(Array.isArray(queue.requests));
        assert.strictEqual(queue.requests.length, 0);
        assert.strictEqual(queue.request_buffer, 1000);
        assert.strictEqual(queue.last_request_time, 0);
        assert.strictEqual(queue.timer, null);
      });

    });
  });

  describe('add()', function () {
    it('should detect invalid arguments', function () {

      var queue = new Queue();

      assert.throws(function () {
        queue.add();
      }, /^Invalid request/);

      assert.throws(function () {
        queue.add('fake');
      }, /^Invalid request/);

      assert.throws(function () {
        queue.add({callback: 'fake'});
      }, /^Invalid request callback/);

    });

    it('should add and process a mock request that takes half a second', function (done) {

      assert.doesNotThrow(function () {
        var queue = new Queue();
        var start = (new Date()).getTime();
        queue.add(new TestRequest(function (error, response, body) {

          assert.strictEqual(error, 'fake_error');
          assert.strictEqual(response, 'fake_response');
          assert.strictEqual(body, 'fake_body');
          var end = (new Date()).getTime();
          var difference = end - start;
          assert.ok(difference >= TestRequest.processTime);
          done();

        }, 'fake_error', 'fake_response', 'fake_body'));
      });

    });

    it('should add and process multiple requests while waiting 400 milliseconds between each', function (done) {

      assert.doesNotThrow(function () {
        var waitTime = 400;
        var queue = new Queue(waitTime);
        var start1 = (new Date()).getTime(), start2;
        var end1, end2;
        var difference1, difference2;

        queue.add(new TestRequest(function (error, response, body) {

          assert.strictEqual(error, 'fake_error1');
          assert.strictEqual(response, 'fake_response1');
          assert.strictEqual(body, 'fake_body1');
          end1 = (new Date()).getTime();
          difference1 = end1 - start1;
          assert.ok(difference1 >= TestRequest.processTime);

        }, 'fake_error1', 'fake_response1', 'fake_body1'));

        start2 = (new Date()).getTime();
        queue.add(new TestRequest(function (error, response, body) {

          assert.strictEqual(error, 'fake_error2');
          assert.strictEqual(response, 'fake_response2');
          assert.strictEqual(body, 'fake_body2');
          end2 = (new Date()).getTime();
          difference2 = end2 - start2;
          assert.ok(difference2 >= TestRequest.processTime);
          assert.ok((end2 - start1) >= (TestRequest.processTime * 2 + waitTime)); // 2 processes + 1 wait
          assert.strictEqual(queue.requests.length, 0);
          assert.strictEqual(queue.current, null);
          done();

        }, 'fake_error2', 'fake_response2', 'fake_body2'));

        assert.strictEqual(queue.requests.length, 1);
        assert.strictEqual(typeof queue.current, 'object');
      });

    });
  });

  describe('now()', function () {
    it('should return unix time in milliseconds', function () {

      var queue = new Queue();
      var now = queue.now();
      assert.strictEqual(typeof now, 'number');
      assert.ok(now > 0);
      assert.ok(now <= (new Date()).getTime());
      assert.ok(now > ((new Date()).getTime() - 100));

    });
  });

  describe('next()', function () {
    it('should do nothing if the queue is empty', function () {

      assert.doesNotThrow(function () {
        var queue = new Queue();
        assert.strictEqual(queue.current, null);
        assert.strictEqual(queue.requests.length, 0);
        assert.strictEqual(queue.timer, null);
        queue.next();
        assert.strictEqual(queue.current, null);
        assert.strictEqual(queue.requests.length, 0);
        assert.strictEqual(queue.timer, null);
      });

    });
  });

  describe('setTimer()', function () {
    it('should set a timer that calls a function after 1 second', function (done) {

      var queue = new Queue();
      var start = (new Date()).getTime();
      queue.setTimer(1000, function () {
        assert.strictEqual(queue.timer, null);
        var end = (new Date()).getTime();
        var difference = end - start;
        assert.ok(difference >= 1000);
        done();
      });
      assert.ok(queue.timer);
      assert.strictEqual(typeof queue.timer, 'object');

    });
  });

  describe('clearTimer()', function () {
    it('should remove any existing timer', function () {

      var queue = new Queue();
      queue.setTimer(1000, function () {
        throw 'Error: Timer called before being cleared'; // Shouldn't be reached
      });
      assert.ok(queue.timer);
      assert.strictEqual(typeof queue.timer, 'object');
      queue.clearTimer();
      assert.strictEqual(queue.timer, null);

    });
  });

  describe('kill()', function () {
    it('should remove any existing timer and requests', function () {

      var queue = new Queue();
      queue.setTimer(1000, function () {
        throw 'Error: Timer called before being cleared'; // Shouldn't be reached
      });
      assert.ok(queue.timer);
      assert.strictEqual(typeof queue.timer, 'object');
      queue.kill();
      assert.strictEqual(queue.timer, null);
      assert.ok(Array.isArray(queue.requests));
      assert.strictEqual(queue.requests.length, 0);
      assert.strictEqual(queue.current, null);

    });
  });
});
