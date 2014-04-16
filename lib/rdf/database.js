// Generated by CoffeeScript 1.7.1
(function() {
  var Database, DatabaseInterface, async, buildTimeSeriesQuery, mongo2sparql, options2sparql, triplestores, value2rdf, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore');

  DatabaseInterface = require('../interface/database');

  async = require('async');

  _ref = require('./utils'), mongo2sparql = _ref.mongo2sparql, value2rdf = _ref.value2rdf, options2sparql = _ref.options2sparql, buildTimeSeriesQuery = _ref.buildTimeSeriesQuery;

  triplestores = {
    'stardog': require('./triplestores/stardog'),
    'virtuoso': require('./triplestores/virtuoso')
  };

  Database = (function(_super) {
    __extends(Database, _super);

    Database.prototype.dbtype = 'rdf';

    function Database(options) {
      this.beforeRegister = __bind(this.beforeRegister, this);
      this.registerClasses = __bind(this.registerClasses, this);
      this.registerModels = __bind(this.registerModels, this);
      this.facets = __bind(this.facets, this);
      this["delete"] = __bind(this["delete"], this);
      this.count = __bind(this.count, this);
      this.clear = __bind(this.clear, this);
      Database.__super__.constructor.call(this, options);
      this.graphURI = options.graphURI;
      if (!this.graphURI) {
        throw "graphURI is required";
      }
      if (triplestores[options.store] == null) {
        throw "unkwown store";
      }
      this.store = new triplestores[options.store](options);
      this.namespace = options.namespace;
      if (!this.namespace) {
        this.namespace = this.graphURI;
      }
      this.defaultClassesNamespace = options.defaultClassesNamespace;
      if (!this.defaultClassesNamespace) {
        this.defaultClassesNamespace = "" + this.namespace + "/classes";
      }
      this.defaultPropertiesNamespace = options.defaultPropertiesNamespace;
      if (!this.defaultPropertiesNamespace) {
        this.defaultPropertiesNamespace = "" + this.namespace + "/properties";
      }
      this.defaultInstancesNamespace = options.defaultInstancesNamespace;
      if (!this.defaultInstancesNamespace) {
        this.defaultInstancesNamespace = "" + this.namespace + "/instances";
      }
      this._propertiesIndexURI = {};
    }

    Database.prototype.clear = function(callback) {
      return this.store.clear(callback);
    };

    Database.prototype.count = function(query, options, callback) {
      var e, sparqlQuery;
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (typeof query === 'function') {
        callback = query;
        options = {};
        query = null;
      }
      if (callback == null) {
        throw "callback required";
      }
      try {
        query = mongo2sparql(query);
      } catch (_error) {
        e = _error;
        return callback(e);
      }
      sparqlQuery = "select (count(distinct ?s) as ?total)\nfrom <" + this.graphURI + "> where " + query;
      return this.store.count(sparqlQuery, callback);
    };

    Database.prototype._find = function(query, options, callback) {
      var e, sparqlQuery;
      if (query._id != null) {
        return this._findByIds(query._id, options, callback);
      }
      try {
        query = mongo2sparql(query, options);
      } catch (_error) {
        e = _error;
        return callback(e);
      }
      sparqlQuery = "select distinct ?s from <" + this.graphURI + "> where " + query;
      return this.store.query(sparqlQuery, (function(_this) {
        return function(err, data) {
          var ids, item;
          if (err) {
            return callback(err);
          }
          ids = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              item = data[_i];
              _results.push(item.s.value);
            }
            return _results;
          })();
          if (!options.instances) {
            return callback(null, ids);
          } else {
            return _this._findByIds(ids, callback);
          }
        };
      })(this));
    };

    Database.prototype._findByIds = function(ids, options, callback) {
      return this.store.describe(ids, options, (function(_this) {
        return function(err, results) {
          if (err) {
            return callback(err);
          }
          return callback(null, results);
        };
      })(this));
    };

    Database.prototype._findById = function(id, options, callback) {
      return this._findByIds([id], options, callback);
    };

    Database._findViaSparqlite = function(SparqliteQuery, options, callback) {};

    Database.prototype["delete"] = function(uri, callback) {
      var deleteQuery;
      if (!uri) {
        return callback("id must not be null");
      }
      deleteQuery = "delete {graph <" + this.graphURI + "> {<" + uri + "> ?p ?o .}}\nwhere {<" + uri + "> ?p ?o .}";
      return this.store.update(deleteQuery, function(err, ok) {
        if (err) {
          return callback(err);
        }
        if (!ok) {
          return callback("error while deleting the data");
        }
        return callback(null);
      });
    };

    Database.prototype.facets = function(field, query, options, callback) {
      var e, propURI, sparqlQuery, _prop;
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      } else if (typeof query === 'function') {
        callback = query;
        query = {};
        options = {};
      }
      if (!field) {
        throw 'field is required';
      }
      if (!callback) {
        throw 'callback is required';
      }
      if (options.limit == null) {
        options.limit = 30;
      }
      if (options.order == null) {
        options.order = 'desc';
      }
      sparqlQuery = '';
      if (!_.isEmpty(query)) {
        try {
          sparqlQuery = mongo2sparql(query, options, {
            queryOnly: true
          });
        } catch (_error) {
          e = _error;
          return callback(e);
        }
      }
      if (field.indexOf('->') > -1) {
        propURI = ((function() {
          var _i, _len, _ref1, _results;
          _ref1 = field.split('->');
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            _prop = _ref1[_i];
            _results.push("<" + _prop + ">");
          }
          return _results;
        })()).join('/');
      } else {
        propURI = "<" + field + ">";
      }
      sparqlQuery = "select ?facet, (count(?facet) as ?count) from <" + this.graphURI + "> where {\n    ?s " + propURI + " ?facet .\n    " + sparqlQuery + "\n}\ngroup by ?facet\norder by " + options.order + "(?count) asc(?facet)\nlimit " + options.limit;
      return this.store.query(sparqlQuery, (function(_this) {
        return function(err, data) {
          var item, results, _i, _len;
          if (err) {
            return callback(err);
          }
          results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            item = data[_i];
            results.push({
              facet: item.facet.value,
              count: parseInt(item.count.value, 10)
            });
          }
          return callback(null, results);
        };
      })(this));
    };

    Database.prototype.timeSeries = function(dateField, step, query, options, callback) {
      var e, groupBy, modifiers, propURI, sparqlQuery, _prop, _ref1;
      if (!dateField) {
        throw 'field is required';
      }
      if (!step) {
        throw 'step is required';
      }
      if (!callback && typeof query === 'function') {
        callback = query;
        query = {};
        options = {};
      } else if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
      }
      if (!callback) {
        throw 'callback is required';
      }
      if (options.limit == null) {
        options.limit = 30;
      }
      if (options.order == null) {
        options.order = 'asc';
      }
      if (step === '$second') {
        return this.facets(dateField, query, options, callback);
      }
      if (dateField.indexOf('->') > -1) {
        propURI = ((function() {
          var _i, _len, _ref1, _results;
          _ref1 = dateField.split('->');
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            _prop = _ref1[_i];
            _results.push("<" + _prop + ">");
          }
          return _results;
        })()).join('/');
      } else {
        propURI = "<" + dateField + ">";
      }
      _ref1 = buildTimeSeriesQuery(step), modifiers = _ref1.modifiers, groupBy = _ref1.groupBy;
      sparqlQuery = '';
      if (!_.isEmpty(query)) {
        try {
          sparqlQuery = mongo2sparql(query, options, {
            queryOnly: true
          });
        } catch (_error) {
          e = _error;
          return callback(e);
        }
      }
      sparqlQuery = "select ?facet, (count(?facet) as ?count) from <" + this.graphURI + "> where {\n    " + sparqlQuery + "\n    ?s " + propURI + " ?date .\n    " + modifiers + "\n}\n\nGROUP BY " + groupBy + "\norder by " + options.order + "(?facet)\nlimit " + options.limit;
      return this.store.query(sparqlQuery, (function(_this) {
        return function(err, data) {
          var item, results, _i, _len;
          if (err) {
            return callback(err);
          }
          results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            item = data[_i];
            results.push({
              facet: item.facet.value,
              count: parseInt(item.count.value, 10)
            });
          }
          return callback(null, results);
        };
      })(this));
    };

    Database.prototype.sync = function(pojo, options, callback) {
      var convertedPojo, sparqlQuery;
      if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
      }
      if (!callback) {
        throw 'callback is required';
      }
      convertedPojo = this.__fillPojoUri(pojo);
      sparqlQuery = this._getSparqlSyncQuery(convertedPojo);
      if (sparqlQuery === null) {
        return callback(null, pojo, {
          dbTouched: false
        });
      }
      return this.store.update(sparqlQuery, options, (function(_this) {
        return function(err, ok) {
          if (err) {
            return callback(err);
          }
          if (!ok) {
            return callback("error while syncing the data");
          }
          return callback(null, convertedPojo, {
            dbTouched: true
          });
        };
      })(this));
    };

    Database.prototype.serialize = function(pojo) {
      var ntriples;
      if (pojo._id == null) {
        pojo._id = this.__buildURI();
      }
      ntriples = this._pojo2nt(pojo._id, pojo);
      return ntriples.join(' .\n') + ' .\n';
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
      return async.map(pojos, ((function(_this) {
        return function(pojo, cb) {
          var convertedPojo, dbTouched, e, sparqlQuery;
          try {
            convertedPojo = _this.__fillPojoUri(pojo);
            sparqlQuery = _this._getSparqlSyncQuery(convertedPojo);
          } catch (_error) {
            e = _error;
            return cb(e);
          }
          if (sparqlQuery === null) {
            sparqlQuery = '';
            dbTouched = false;
          } else {
            dbTouched = true;
          }
          return cb(null, {
            pojo: convertedPojo,
            dbTouched: dbTouched,
            sparqlQuery: sparqlQuery
          });
        };
      })(this)).bind(this), (function(_this) {
        return function(err, data) {
          var item, results, sparqlQuery, _i, _len;
          if (err) {
            return callback(err);
          }
          sparqlQuery = [];
          results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            item = data[_i];
            sparqlQuery.push(item.sparqlQuery);
            results.push({
              result: item.pojo,
              options: {
                dbTouched: item.dbTouched
              }
            });
          }
          return _this.store.update(sparqlQuery.join('\n'), function(err, ok) {
            if (err) {
              return callback(err);
            }
            return callback(null, results);
          });
        };
      })(this));
    };

    Database.prototype._getSparqlSyncQuery = function(pojo) {
      var ntriples, sparqlQuery;
      sparqlQuery = [];
      if (pojo._id != null) {
        sparqlQuery.push("delete {graph <" + this.graphURI + "> {<" + pojo._id + "> ?p ?o .}}\nwhere {<" + pojo._id + "> ?p ?o .};");
      } else {
        pojo._id = this.__buildURI();
      }
      ntriples = this._pojo2nt(pojo._id, pojo);
      sparqlQuery.push("insert data {\n    graph <" + this.graphURI + "> {" + (ntriples.join(' .\n\t')) + " }\n};");
      return sparqlQuery.join('\n');
    };

    Database.prototype.registerModels = function(models) {
      var field, fieldName, model, modelName, uri, _results;
      Database.__super__.registerModels.call(this, models);
      _results = [];
      for (modelName in models) {
        model = models[modelName];
        _results.push((function() {
          var _ref1, _results1;
          _ref1 = model.prototype.schema;
          _results1 = [];
          for (fieldName in _ref1) {
            field = _ref1[fieldName];
            uri = field.uri || ("" + model.prototype.meta.propertiesNamespace + "/" + fieldName);
            _results1.push(this._propertiesIndexURI[uri] = fieldName);
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    Database.prototype.registerClasses = function(classes) {
      return this.registerModels(classes);
    };

    Database.prototype.validateModel = function(modelName, model) {
      var ns, requiredNS, _i, _len, _results;
      Database.__super__.validateModel.call(this, modelName, model);
      requiredNS = ['uri', 'graphURI', 'instancesNamespace', 'propertiesNamespace'];
      _results = [];
      for (_i = 0, _len = requiredNS.length; _i < _len; _i++) {
        ns = requiredNS[_i];
        if (!model.prototype.meta[ns]) {
          throw "" + modelName + ".meta." + ns + " not found";
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Database.prototype.beforeRegister = function(modelName, model) {
      var loweredModelName;
      if (model.prototype.schema == null) {
        model.prototype.schema = model.prototype.properties;
      }
      Database.__super__.beforeRegister.call(this, modelName, model);
      if (!model.prototype.meta.uri) {
        model.prototype.meta.uri = "" + this.defaultClassesNamespace + "/" + modelName;
      }
      model.prototype.meta.type = model.prototype.meta.uri;
      if (!model.prototype.meta.graphURI) {
        model.prototype.meta.graphURI = this.graphURI;
      }
      if (!model.prototype.meta.propertiesNamespace) {
        loweredModelName = modelName.toLowerCase();
        model.prototype.meta.propertiesNamespace = this.defaultPropertiesNamespace;
      }
      if (!model.prototype.meta.instancesNamespace) {
        loweredModelName = modelName.toLowerCase();
        return model.prototype.meta.instancesNamespace = "" + this.defaultInstancesNamespace + "/" + loweredModelName;
      }
    };

    Database.prototype.__buildURI = function() {
      return "" + this.defaultInstancesNamespace + "/" + (this.__buildId());
    };

    Database.prototype.__fillPojoUri = function(pojo) {
      var fieldName, newpojo, value;
      newpojo = {};
      for (fieldName in pojo) {
        value = pojo[fieldName];
        if (fieldName === '_id' || fieldName === '_type') {
          newpojo[fieldName] = value;
        } else if (!_.str.startsWith(fieldName, 'http://')) {
          newpojo["" + this.defaultPropertiesNamespace + "/" + fieldName] = value;
        } else {
          newpojo[fieldName] = value;
        }
      }
      return newpojo;
    };

    Database.prototype._pojo2nt = function(uri, changes) {
      var addTriple, lang, ntriples, property, val, value, _i, _j, _len, _len1, _val;
      ntriples = [];
      addTriple = (function(_this) {
        return function(value, lang) {
          var triple;
          if (_.isObject(value) && (value._uri != null)) {
            triple = "<" + uri + "> <" + property + "> <" + value._uri + ">";
          } else {
            value = value2rdf(value, lang);
            triple = "<" + uri + "> <" + property + "> " + value;
          }
          return ntriples.push(triple);
        };
      })(this);
      for (property in changes) {
        value = changes[property];
        if (property === '_id') {
          continue;
        } else if (property === '_type') {
          ntriples.push("<" + uri + "> a <" + value + ">");
          continue;
        }
        if ((value._uri != null) && _.isArray(value._uri)) {
          value = (function() {
            var _i, _len, _ref1, _results;
            _ref1 = value._uri;
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              val = _ref1[_i];
              _results.push({
                _uri: val
              });
            }
            return _results;
          })();
        }
        if (_.isArray(value)) {
          for (_i = 0, _len = value.length; _i < _len; _i++) {
            val = value[_i];
            if (val !== null && val !== (void 0)) {
              addTriple(val);
            }
          }
        } else if (_.isObject(value) && (value._uri == null) && !_.isDate(value)) {
          for (lang in value) {
            val = value[lang];
            if (_.isArray(val)) {
              for (_j = 0, _len1 = val.length; _j < _len1; _j++) {
                _val = val[_j];
                if (_val !== null && _val !== (void 0)) {
                  addTriple(_val, lang);
                }
              }
            } else {
              addTriple(val, lang);
            }
          }
        } else {
          addTriple(value);
        }
      }
      return ntriples;
    };

    return Database;

  })(DatabaseInterface);

  module.exports = Database;

}).call(this);