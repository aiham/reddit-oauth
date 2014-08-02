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

    it('should add and process multiple requests while waiting 1 second between each', function (done) {

      assert.doesNotThrow(function () {
        var waitTime = 1000;
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

  describe('request()', function () {
    it('should fail when code 404 when invalid path is provided', function (done) {

      var reddit = new RedditApi({
        app_id: 'fake',
        app_secret: 'fake'
      });
      reddit.request(
        '/an-invalid-api-path-that-does-not-exist',
        null,
        function (error, response, body) {

          assert.ok(error);
          assert.strictEqual(response.statusCode, 404);
          done();

        }
      );

    });

    it('should successfully get the google homepage but fail to parse it', function (done) {

      var reddit = new RedditApi({
        app_id: 'fake',
        app_secret: 'fake'
      });
      reddit.request(
        null,
        {url: 'http://www.google.com'},
        function (error, response, body) {

          assert.ok(error);
          assert.ok(/^SyntaxError/.test(error));
          assert.strictEqual(response.statusCode, 200);
          done();

        }
      );

    });
  });

  describe('passAuth()', function () {
    it('should fail to authorise with invalid app_id/app_secret', function (done) {

      var reddit = new RedditApi({
        app_id: 'fake_app_id',
        app_secret: 'fake_app_secret'
      });
      reddit.passAuth('fake_username', 'fake_password', function (success) {

        assert.ok(!success);
        assert.ok(!reddit.isAuthed());
        done();

      });

    });

    it('should fail to authorise with invalid username/password', function (done) {

      var reddit = new RedditApi({
        app_id: 'real_app_id',
        app_secret: 'real_app_secret'
      });
      reddit.passAuth('fake_username', 'fake_password', function (success) {

        assert.ok(!success);
        assert.ok(!reddit.isAuthed());
        done();

      });

    });

    it('should successfully authorise with valid username/password', function (done) {

      var reddit = new RedditApi({
        app_id: 'real_app_id',
        app_secret: 'real_app_secret'
      });
      reddit.passAuth('real_username', 'real_password', function (success) {

        assert.ok(success);
        assert.ok(reddit.isAuthed());
        done();

      });

    });
  });

  describe('oAuthUrl()', function () {
    it('should fail when invalid scope is provided', function () {

      var reddit = new RedditApi({
        app_id: 'fake_app_id',
        app_secret: 'fake_app_secret',
        redirect_uri: 'fake_redirect_uri'
      });

      assert.throws(function () {
        reddit.oAuthUrl();
      }, /^Invalid scope/);

      assert.throws(function () {
        reddit.oAuthUrl('fake_state');
      }, /^Invalid scope/);

      assert.throws(function () {
        reddit.oAuthUrl('fake_state', 1);
      }, /^Invalid scope/);

      assert.throws(function () {
        reddit.oAuthUrl('fake_state', null);
      }, /^Invalid scope/);

      assert.throws(function () {
        reddit.oAuthUrl('fake_state', {});
      }, /^Invalid scope/);

    });

    it('should return a valid URL for authorisation with Reddit', function () {

      var reddit = new RedditApi({
        app_id: 'fake_app_id',
        app_secret: 'fake_app_secret',
        redirect_uri: 'fake_redirect_uri'
      });
      var actual = reddit.oAuthUrl('fake_state', 'fake_scope');
      var expected = 'https://ssl.reddit.com/api/v1/authorize?client_id=fake_app_id&response_type=code&state=fake_state&redirect_uri=fake_redirect_uri&duration=permanent&scope=fake_scope';
      assert.strictEqual(actual, expected);

    });
  });
});
