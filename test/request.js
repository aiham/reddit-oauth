'use strict';

var assert = require('assert'),
    sinon = require('sinon'),
    request = require('request'),
    RedditRequest = require('../lib/request'),
    undefined = void 0;

describe('RedditRequest', function () {
    describe('new RedditRequest()', function () {
        it('should initialise the object without any arguments', function () {
            assert.doesNotThrow(function () {
                var redditRequest = new RedditRequest();
                assert.strictEqual(redditRequest.options, undefined);
                assert.strictEqual(redditRequest.callback, undefined);
            });
        });

        it('should initialise the object with only options', function () {
            assert.doesNotThrow(function () {
                var options = {},
                    redditRequest = new RedditRequest(options);
                assert.strictEqual(redditRequest.options, options);
                assert.strictEqual(redditRequest.callback, undefined);
            });
        });

        it('should initialise the object with only a callback', function () {
            assert.doesNotThrow(function () {
                var callback = function () {},
                    redditRequest = new RedditRequest(void 0, callback);
                assert.strictEqual(redditRequest.options, undefined);
                assert.strictEqual(redditRequest.callback, callback);
            });
        });

        it('should initialise the object with options and a callback', function () {
            assert.doesNotThrow(function () {
                var options = {},
                    callback = function () {},
                    redditRequest = new RedditRequest(options, callback);
                assert.strictEqual(redditRequest.options, options);
                assert.strictEqual(redditRequest.callback, callback);
            });
        });
    });

    describe('send()', function () {
        var stub;

        beforeEach(function () {
            stub = sinon.stub(request, 'get', function (options, callback) {
                if (typeof callback === 'function') {
                    callback();
                }
            });
        });

        afterEach(function () {
            stub.restore();
            stub = undefined;
        });

        it('should invoke the request package without options', function () {
            var redditRequest = new RedditRequest();

            assert.doesNotThrow(function () {
                assert.strictEqual(stub.callCount, 0);
                assert.strictEqual(redditRequest.send(), undefined);
                assert.strictEqual(stub.callCount, 1);
                assert(stub.firstCall.calledWithExactly(undefined, undefined));
            });
        });

        it('should invoke the request package without a callback', function () {
            var options = {},
                redditRequest = new RedditRequest(options);

            assert.doesNotThrow(function () {
                assert.strictEqual(stub.callCount, 0);
                assert.strictEqual(redditRequest.send(), undefined);
                assert.strictEqual(stub.callCount, 1);
                assert(stub.firstCall.calledWithExactly(options, undefined));
            });
        });

        it('should invoke the request package with second callback', function () {
            var options = {},
                firstCallback = sinon.spy(),
                secondCallback = sinon.spy(),
                redditRequest = new RedditRequest(options, firstCallback);

            assert.doesNotThrow(function () {
                assert.strictEqual(stub.callCount, 0);
                assert.strictEqual(redditRequest.send(secondCallback), undefined);
                assert.strictEqual(stub.callCount, 1);
                assert(stub.firstCall.calledWithExactly(options, secondCallback));
            });
        });

        it('should keep original callback without calling it', function () {
            var options = {},
                firstCallback = sinon.spy(),
                secondCallback = sinon.spy(),
                redditRequest = new RedditRequest(options, firstCallback);

            assert.doesNotThrow(function () {
                assert.strictEqual(firstCallback.callCount, 0);
                assert.strictEqual(secondCallback.callCount, 0);
                assert.strictEqual(redditRequest.send(secondCallback), undefined);
                assert.strictEqual(firstCallback.callCount, 0);
                assert.strictEqual(secondCallback.callCount, 1);
                assert.strictEqual(redditRequest.callback, firstCallback);
            });
        });
    });
});
