// Generated by CoffeeScript 1.7.1
(function() {
  var Database, Type, async, deepClone, defaultTypes, extendOnClass, objectdiff, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ref = require('./types'), defaultTypes = _ref.defaultTypes, Type = _ref.Type;

  extendOnClass = require('extendonclass').extendOnClass;

  objectdiff = require('objectdiff');

  async = require('async');

  _ = require('underscore');

  deepClone = require('./utils').deepClone;

  Database = (function() {
    Database.extend = extendOnClass;

    function Database(options) {
      this.registerModels = __bind(this.registerModels, this);
      this.facets = __bind(this.facets, this);
      this.clear = __bind(this.clear, this);
      options = options || {};
      this.modelsList = [];
      this._cache = {};
      this._types = defaultTypes;
    }

    Database.prototype.count = function(query, options, callback) {
      return callback('count() is not implemented');
    };

    Database.prototype.clear = function(callback) {
      return callback('clear() is not implemented');
    };

    Database.prototype.find = function(query, options, callback) {
      if (typeof query === 'function') {
        callback = query;
        query = {};
        options = {};
      } else if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (options.instances == null) {
        options.instances = true;
      }
      if (!callback) {
        throw 'callback is required';
      }
      if (_.isString(query)) {
        return this._findById(query, options, callback);
      } else if (_.isArray(query)) {
        return this._findByIds(query, options, callback);
      } else {
        return this._find(query, options, callback);
      }
    };

    Database.prototype._findById = function(query, options, callback) {
      return callback('_findById() is not implemented');
    };

    Database.prototype._findByIds = function(query, options, callback) {
      return callback('_findByIds() is not implemented');
    };

    Database.prototype._find = function(query, options, callback) {
      return callback('_find() is not implemented');
    };

    Database.prototype.first = function(query, options, callback) {
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (!callback) {
        throw 'callback is required';
      }
      options.limit = 1;
      return this.find(query, options, function(err, results) {
        if (err) {
          return callback(err);
        }
        if (results.length > 0) {
          results = results[0];
        } else {
          results = null;
        }
        return callback(null, results);
      });
    };

    Database.prototype.facets = function(query, options, callback) {
      return callback('facets() is not implemented');
    };

    Database.prototype.sync = function(pojo, options, callback) {
      var changes;
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (!callback) {
        throw 'callback is required';
      }
      changes = null;
      changes = this.changes(pojo);
      if (changes === null) {
        return callback(null, pojo, {
          dbTouched: false
        });
      }
      if (pojo._id) {
        options.changes = changes;
        return this._update(pojo, options, (function(_this) {
          return function(err, obj) {
            if (err) {
              return callback(err);
            }
            _this._updateCache(pojo);
            return callback(null, pojo, {
              dbTouched: true
            });
          };
        })(this));
      } else {
        return this._insert(pojo, options, (function(_this) {
          return function(err, obj) {
            if (err) {
              return callback(err);
            }
            _this._updateCache(obj);
            return callback(null, obj, {
              dbTouched: true
            });
          };
        })(this));
      }
    };

    Database.prototype._update = function(pojo, options, callback) {
      return callback('_update() is not implemented');
    };

    Database.prototype._insert = function(pojo, options, callback) {
      return callback('_insert() is not implemented');
    };

    Database.prototype.batchSync = function(objects, options, callback) {
      var pojo, pojos;
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (!callback) {
        throw 'callback is required';
      }
      if (!(objects || !_.isArray(objects))) {
        throw 'an array of objects is required';
      }
      pojos = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          pojo = objects[_i];
          _results.push((pojo.toSerializableObject != null) && pojo.toSerializableObject() || pojo);
        }
        return _results;
      })();
      return async.map(pojos, (function(_this) {
        return function(pojo, cb) {
          return _this.sync(pojo, options, function(err, result, options) {
            if (err) {
              return cb(err);
            }
            return cb(null, {
              result: result,
              options: options
            });
          });
        };
      })(this), function(err, results, options) {
        if (err) {
          return callback(err);
        }
        return callback(null, results);
      });
    };

    Database.prototype.changes = function(pojo) {
      var added, cachedPojo, diff, fieldName, index, infos, key, lang, removed, __infos, _infos, _ref1, _ref2, _ref3, _ref4;
      if (this._cache[pojo._id] === void 0) {
        return void 0;
      }
      cachedPojo = this._cache[pojo._id];
      diff = objectdiff.diff(cachedPojo, pojo);
      added = {};
      removed = {};
      if (diff.changed === 'object change') {
        _ref1 = diff.value;
        for (fieldName in _ref1) {
          infos = _ref1[fieldName];
          if (infos.changed === 'object change') {
            if (_.isArray(pojo[fieldName])) {
              if (infos.changed !== 'equal') {
                _ref2 = infos.value;
                for (key in _ref2) {
                  _infos = _ref2[key];
                  if (_infos.changed !== 'equal') {
                    if (!added[fieldName]) {
                      added[fieldName] = [];
                    }
                    if (!removed[fieldName]) {
                      removed[fieldName] = [];
                    }
                    if (_infos.changed === 'added') {
                      added[fieldName].push(_infos.value);
                    } else if (_infos.changed === 'removed') {
                      removed[fieldName].push(_infos.value);
                    } else if (_infos.changed === 'primitive change') {
                      added[fieldName].push(_infos.added);
                      removed[fieldName].push(_infos.removed);
                    }
                  }
                }
              }
            } else {
              if (infos.changed !== 'equal') {
                if (!added[fieldName]) {
                  added[fieldName] = {};
                }
                if (!removed[fieldName]) {
                  removed[fieldName] = {};
                }
                _ref3 = infos.value;
                for (lang in _ref3) {
                  _infos = _ref3[lang];
                  if (_infos.changed === 'added') {
                    added[fieldName][lang] = _infos.value;
                  } else if (_infos.changed === 'removed') {
                    removed[fieldName][lang] = _infos.value;
                  } else if (_infos.changed === 'primitive change') {
                    added[fieldName][lang] = _infos.added;
                    removed[fieldName][lang] = _infos.removed;
                  } else if (_infos.changed === 'object change') {
                    _ref4 = _infos.value;
                    for (index in _ref4) {
                      __infos = _ref4[index];
                      if (!added[fieldName][lang]) {
                        added[fieldName][lang] = [];
                      }
                      if (!removed[fieldName][lang]) {
                        removed[fieldName][lang] = [];
                      }
                      if (__infos.changed === 'added') {
                        added[fieldName][lang].push(__infos.value);
                      } else if (__infos.changed === 'removed') {
                        removed[fieldName][lang].push(__infos.value);
                      } else if (__infos.changed === 'primitive change') {
                        added[fieldName][lang].push(__infos.added);
                        removed[fieldName][lang].push(__infos.removed);
                      }
                    }
                  }
                }
              }
            }
          } else {
            if (infos.changed === 'added') {
              added[fieldName] = infos.value;
            } else if (infos.changed === 'removed') {
              removed[fieldName] = infos.value;
            } else if (infos.changed === 'primitive change') {
              added[fieldName] = infos.added;
              removed[fieldName] = infos.removed;
            }
          }
        }
        return {
          added: added,
          removed: removed
        };
      }
      return null;
    };

    Database.prototype.registerCustomTypes = function(types) {
      var type, typeName, _results;
      _results = [];
      for (typeName in types) {
        type = types[typeName];
        _results.push(this._types[typeName] = new Type(this, type));
      }
      return _results;
    };

    Database.prototype.registerModels = function(models) {
      var model, modelName, _results;
      _results = [];
      for (modelName in models) {
        model = models[modelName];
        this.beforeRegister(modelName, model);
        model.prototype.db = this;
        model.db = this;
        this.validateModel(modelName, model);
        this[modelName] = model;
        _results.push(this.modelsList.push(modelName));
      }
      return _results;
    };

    Database.prototype.clearRegisteredModels = function() {
      var modelName, _i, _len, _ref1;
      _ref1 = this.modelsList;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        modelName = _ref1[_i];
        delete this[modelName];
      }
      return this.modelsList = [];
    };

    Database.prototype.beforeRegister = function(modelName, model) {
      var key, meta, schema, value, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      schema = {};
      _ref2 = ((_ref1 = model.__super__) != null ? _ref1.schema : void 0) || {};
      for (key in _ref2) {
        value = _ref2[key];
        schema[key] = deepClone(value);
      }
      _ref3 = model.prototype.schema || {};
      for (key in _ref3) {
        value = _ref3[key];
        schema[key] = deepClone(value, schema[key]);
      }
      model.prototype.schema = schema;
      meta = {};
      _ref5 = ((_ref4 = model.__super__) != null ? _ref4.meta : void 0) || {};
      for (key in _ref5) {
        value = _ref5[key];
        meta[key] = value;
      }
      _ref6 = model.prototype.meta || {};
      for (key in _ref6) {
        value = _ref6[key];
        meta[key] = value;
      }
      meta.name = modelName;
      meta.type = modelName;
      model.prototype.meta = meta;
      if (!model.prototype.meta.defaultLang) {
        return model.prototype.meta.defaultLang = this.defaultLang;
      }
    };

    Database.prototype.validateModel = function(modelName, model) {
      var field, fieldName, _ref1, _results;
      if (model.prototype.schema == null) {
        throw "" + modelName + " has not schema";
      }
      _ref1 = model.prototype.schema;
      _results = [];
      for (fieldName in _ref1) {
        field = _ref1[fieldName];
        if (field.i18n && field.type !== 'string') {
          throw "" + modelName + "." + fieldName + " is i18n and must be of type string";
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Database.prototype._updateCache = function(obj) {
      var key, lang, val, value, _results;
      this._cache[obj._id] = {};
      _results = [];
      for (key in obj) {
        value = obj[key];
        if (_.isArray(value)) {
          _results.push(this._cache[obj._id][key] = (function() {
            var _i, _len, _results1;
            _results1 = [];
            for (_i = 0, _len = value.length; _i < _len; _i++) {
              val = value[_i];
              _results1.push(_.clone(val));
            }
            return _results1;
          })());
        } else if (_.isObject(value) && !_.isArray(value)) {
          if (!this._cache[obj._id][key]) {
            this._cache[obj._id][key] = {};
          }
          _results.push((function() {
            var _results1;
            _results1 = [];
            for (lang in value) {
              val = value[lang];
              _results1.push(this._cache[obj._id][key][lang] = _.clone(val));
            }
            return _results1;
          }).call(this));
        } else {
          _results.push(this._cache[obj._id][key] = _.clone(value));
        }
      }
      return _results;
    };

    Database.prototype.__buildId = function() {
      var now, rand;
      now = new Date();
      rand = Math.floor(Math.random() * 10000);
      return parseInt(rand).toString(36) + parseInt(now.getTime()).toString(36);
    };

    return Database;

  })();

  module.exports = Database;

}).call(this);