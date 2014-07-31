var assert = require('assert');
var RedditApi = require('../reddit-oauth');
var Queue = require('../queue');
var util = require('util');

describe('Queue', function () {
  var TestRequest = function (callback, error, response, body) {

    this.callback = callback;
    this.error = error;
    this.response = response;
    this.body = body;

  };
  TestRequest.prototype = {

    constructor: TestRequest,

    send: function (callback) {

      var that = this;
      setTimeout(function () {

        callback(that.error, that.response, that.body);

      }, 500);

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
        assert.ok(util.isArray(queue.requests));
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
      assert.ok(util.isArray(queue.requests));
      assert.strictEqual(queue.requests.length, 0);
      assert.strictEqual(queue.current, null);

    });
  });
});

describe('RedditApi', function () {
  describe('new RedditApi()', function () {
    it('should initialise the object successfully', function () {

      assert.throws(function () {
        var reddit = new RedditApi();
      }, /^Invalid options/);

      assert.throws(function () {
        var reddit = new RedditApi({});
      }, /^Invalid app ID/);

      assert.throws(function () {
        var reddit = new RedditApi({app_id: 'fake'});
      }, /^Invalid app secret/);

      assert.doesNotThrow(function () {
        var reddit = new RedditApi({
          app_id: 'fake',
          app_secret: 'fake'
        });
        assert.strictEqual(reddit.app_id, 'fake');
        assert.strictEqual(reddit.app_secret, 'fake');
        assert.strictEqual(reddit.redirect_uri, null);
        assert.ok(/^reddit-oauth\/\d+\.\d+\.\d+ by aihamh$/.test(reddit.user_agent));
        assert.strictEqual(reddit.access_token, null);
        assert.strictEqual(reddit.refresh_token, null);
        assert.ok(reddit.queue instanceof Queue);
      });

    });
  });

  describe('isAuthed()', function () {
    it('should return false if access_token is not set', function () {

      var reddit = new RedditApi({
        app_id: 'fake',
        app_secret: 'fake'
      });
      assert.strictEqual(reddit.isAuthed(), false);

    });

    it('should return true if access_token is set', function () {

      var reddit = new RedditApi({
        app_id: 'fake',
        app_secret: 'fake',
        access_token: 'fake'
      });
      assert.strictEqual(reddit.isAuthed(), true);

    });
  });

  describe('request()', function (done) {
    it('should ?', function () {

    });
  });
});
