var request = require('request');
var Queue = require('./queue');
var util = require('util');

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

var RedditApi = function (options) {

  if (!options || typeof options !== 'object') throw 'Invalid options: ' + options;
  if (typeof options.app_id !== 'string') throw 'Invalid app ID: ' + options.app_id;
  if (typeof options.app_secret !== 'string') throw 'Invalid app secret: ' + options.app_secret;

  this.app_id = options.app_id;
  this.app_secret = options.app_secret;
  this.redirect_uri = options.redirect_uri || null;
  this.user_agent = options.user_agent || 'reddit-oauth/1.0.6 by aihamh';
  this.access_token = options.access_token || null;
  this.refresh_token = options.refresh_token || null;
  this.queue = new Queue(options.request_buffer || 2000);

};

RedditApi.prototype = {

  constructor: RedditApi,

  isAuthed: function () {

    return typeof this.access_token === 'string' && this.access_token.length > 0;

  },

  request: function (path, options, callback, is_refreshing_token) {

    if (!options) {
      options = {};
    }

    if (!options.headers) {
      options.headers = {};
    }
    options.headers['User-Agent'] = this.user_agent;
    if (this.isAuthed()) {
      options.headers['Authorization'] = 'bearer ' + this.access_token;
    }

    if (!options.url) {
      var subdomain = this.isAuthed() ? 'oauth' : 'ssl';
      options.url = 'https://' + subdomain + '.reddit.com' + path;
    }

    if (!options.method) {
      options.method = 'GET';
    }

    this.queue.add(new RedditRequest(options, (function (api) {

      return function (error, response, body) {

        if (!error && response.statusCode === 200) {
          try {
            response.jsonData = JSON.parse(body);
          } catch (e) {
            error = e;
          }
        } else if (!is_refreshing_token && response.statusCode === 401 && api.refresh_token) {
          api.refreshToken(function (success) {

            if (success) {
              api.request(path, options, callback);
            } else {
              callback.call(api, error, response, data);
            }

          });
          return;
        } else {
          console.log('reddit-oauth Error:', error, ', Status code:', response.statusCode);
        }
        callback.call(api, error, response, body);

      };

    })(this)));

  },

  passAuth: function (username, password, callback) {

    this.access_token = null;
    this.refresh_token = null;

    this.request('/api/v1/access_token', {
      method: 'POST',
      form: {
        grant_type: 'password',
        username: username,
        password: password
      },
      auth: {
        username: this.app_id,
        password: this.app_secret
      }
    }, function (error, response, body) {

      var success = !error &&
                    typeof response.jsonData === 'object' &&
                    typeof response.jsonData.access_token === 'string' &&
                    response.jsonData.access_token.length > 0;

      if (success) {
        this.access_token = response.jsonData.access_token;
      }

      if (callback) {
        callback(success);
      }

    });

  },

  oAuthUrl: function (state, scope) {

    if (util.isArray(scope)) {
      scope = scope.join(',');
    }

    if (typeof scope !== 'string') {
      throw 'Invalid scope: ' + scope;
    }

    var url = 'https://ssl.reddit.com/api/v1/authorize' +
      '?client_id=' + encodeURIComponent(this.app_id) +
      '&response_type=code' +
      '&state=' + encodeURIComponent(state) +
      '&redirect_uri=' + encodeURIComponent(this.redirect_uri || '') +
      '&duration=permanent' +
      '&scope=' + encodeURIComponent(scope);

    return url;

  },

  oAuthTokens: function (state, query, callback) {

    if (query.state !== state || !query.code) {
      callback(false);
      return;
    }

    this.access_token = null;
    this.refresh_token = null;

    this.request('/api/v1/access_token', {
      method: 'POST',
      form: {
        grant_type: 'authorization_code',
        code: query.code,
        redirect_uri: this.redirect_uri || ''
      },
      auth: {
        username: this.app_id,
        password: this.app_secret
      }
    }, function (error, response, body) {

      var success = !error &&
                    typeof response.jsonData === 'object' &&
                    typeof response.jsonData.access_token === 'string' &&
                    typeof response.jsonData.refresh_token === 'string' &&
                    response.jsonData.access_token.length > 0 &&
                    response.jsonData.refresh_token.length > 0;

      if (success) {
        this.access_token = response.jsonData.access_token;
        this.refresh_token = response.jsonData.refresh_token;
      }

      if (callback) {
        callback(success);
      }

    });

  },

  refreshToken: function (callback) {

    this.access_token = null;

    this.request('/api/v1/access_token', {
      method: 'POST',
      form: {
        grant_type: 'refresh_token',
        refresh_token: this.refresh_token
      },
      auth: {
        username: this.app_id,
        password: this.app_secret
      }
    }, function (error, response, body) {

      var success = !error &&
                    typeof response.jsonData === 'object' &&
                    typeof response.jsonData.access_token === 'string' &&
                    response.jsonData.access_token.length > 0;

      if (success) {
        this.access_token = response.jsonData.access_token;
      }

      if (callback) {
        callback(!error);
      }

    }, true);

  },

  get: function (path, params, callback) {

    var options = null;
    if (params) {
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          if (!options) options = {};
          options.form = params;
          break;
        }
      }
    }
    this.request(path, options, callback);

  },

  post: function (path, params, callback) {

    var options = {method: 'POST'};
    if (params) {
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          options.form = params;
          break;
        }
      }
    }
    this.request(path, options, callback);

  },

  getListing: function (path, params, callback, after, count) {

    if (!count) {
      count = 0;
    }

    var fullPath = path;

    if (after) {
      fullPath += '?after=' + encodeURIComponent(after) + '&count=' + encodeURIComponent(count);
    }

    this.get(fullPath, params, (function (reddit) {

      return function (error, response, body) {

        if (error || response.statusCode !== 200) {
          callback(error, response, body);
          return;
        }

        var nextAfter = response.jsonData.data.after;
        var nextCount = count + response.jsonData.data.children.length;
        var next = nextAfter === null ? null : function () {

          reddit.getListing(path, params, callback, nextAfter, nextCount);

        };

        if (callback) {
          callback(error, response, body, next);
        }

      };

    })(this));

  }

};

module.exports = RedditApi;
