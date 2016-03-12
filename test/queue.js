'use strict';

var assert = require('assert'),
    sinon = require('sinon'),
    RedditRequest = require('../lib/request'),
    Queue = require('../lib/queue'),
    testData = {
        error: 'fake_error',
        response: 'fake_response',
        body: 'fake_body'
    },
    fakeProcessTime = 500,
    sendStub;

describe('Queue', function () {
    beforeEach(function () {
        sendStub = sinon.stub(RedditRequest.prototype, 'send', function (callback) {
            setTimeout(function () {
                callback(testData.error, testData.response, testData.body);
            }, fakeProcessTime);
        });
    });

    afterEach(function () {
        sendStub.restore();
        sendStub = null;
    });

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
                queue.add({});
            }, /^Invalid request/);

            assert.throws(function () {
                queue.add(new RedditRequest(null, 'fake'));
            }, /^Invalid request callback/);

        });

        it('should add and process a mock request that takes half a second', function (done) {

            assert.doesNotThrow(function () {
                var queue = new Queue();
                var start = (new Date()).getTime();
                queue.add(new RedditRequest(null, function (error, response, body) {
                    assert.strictEqual(error, testData.error);
                    assert.strictEqual(response, testData.response);
                    assert.strictEqual(body, testData.body);
                    var end = (new Date()).getTime();
                    var difference = end - start;
                    assert.ok(difference >= fakeProcessTime);
                    done();
                }));
            });

        });

        it('should add and process multiple requests while waiting 400 milliseconds between each', function (done) {

            assert.doesNotThrow(function () {
                var waitTime = 400;
                var queue = new Queue(waitTime);
                var start1 = (new Date()).getTime(),
                    start2;
                var end1, end2;
                var difference1, difference2;

                queue.add(new RedditRequest(null, function (error, response, body) {
                    assert.strictEqual(error, testData.error);
                    assert.strictEqual(response, testData.response);
                    assert.strictEqual(body, testData.body);
                    end1 = (new Date()).getTime();
                    difference1 = end1 - start1;
                    assert.ok(difference1 >= fakeProcessTime);
                }));

                start2 = (new Date()).getTime();
                queue.add(new RedditRequest(null, function (error, response, body) {
                    assert.strictEqual(error, testData.error);
                    assert.strictEqual(response, testData.response);
                    assert.strictEqual(body, testData.body);
                    end2 = (new Date()).getTime();
                    difference2 = end2 - start2;
                    assert.ok(difference2 >= fakeProcessTime);

                    assert.ok((end2 - start1) >= (fakeProcessTime * 2 + waitTime)); // 2 processes + 1 wait
                    assert.strictEqual(queue.requests.length, 0);
                    assert.strictEqual(queue.current, null);
                    done();
                }));

                assert.strictEqual(queue.requests.length, 1);
                assert(queue.current instanceof RedditRequest);
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
