'use strict';

/**
 * {@link https://www.npmjs.com/package/request|Request} package.
 * @external Request
 * @see {@link https://github.com/request/request|Github}
 * @see {@link https://www.npmjs.com/package/request|NPM}
 */
var request = require('request');

/**
 * Options object expected by {@link https://www.npmjs.com/package/request|Request} package.
 * @typedef {Object} external:Request~Options
 * @property {String} url
 * @property {String} [method=GET]
 * @property {Object} [headers={}]
 * @see {@link https://github.com/request/request#requestoptions-callback|Request Options}
 */

/**
 * Callback function expected by {@link https://www.npmjs.com/package/request|Request} package.
 * @callback external:Request~Callback
 * @param {Object} error
 * @param {Object} incomingMessage
 * @param {(String|Buffer|Object)} responseBody
 * @see {@link https://github.com/request/request#requestoptions-callback|Request Callback}
 */

/**
 * Creates instance of {@link RedditRequest}.
 * @class
 * @classdesc Holds onto the options and callback of a pending HTTP request until it is to be executed.
 * @param {external:Request~Options} [options] - Options to store in request instance
 * @param {external:Request~Callback} [callback] - Callback to store in request instance
 */
function RedditRequest(options, callback) {

  /**
   * @type {?external:Request~Options}
   */
  this.options = options;

  /**
   * @type {?external:Request~Callback}
   */
  this.callback = callback;

}

RedditRequest.prototype = {

  constructor: RedditRequest,

  /**
   * Begins the pending HTTP request. A second callback is invoked upon
   * completion of the request instead of the callback instance property to allow
   * the caller to intercept the response before passing it onto the
   * original requester.
   * @param {external:Request~Callback} [callback] - Interceptor callback
   */
  send: function RedditRequest__send(callback) {

    var method;
    if (
        this.options &&
        typeof this.options.method === 'string' &&
        this.options.method.length > 0
    ) {
        method = this.options.method.toLowerCase();
        if ([
            'get',
            'post',
            'head',
            'options',
            'put',
            'patch',
            'delete'
        ].indexOf(method) < 0) {
            method = null;
        }
    }
    request[method || 'get'](this.options, callback);

  }

};

module.exports = RedditRequest;
