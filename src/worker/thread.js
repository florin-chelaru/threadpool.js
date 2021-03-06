/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 8:51 AM
 */

goog.provide('parallel.worker');
goog.provide('parallel.worker.Thread');

/**
 * @param {Object} context
 * @constructor
 */
parallel.worker.Thread = function(context) {
  /**
   * @type {string|number|null}
   * @private
   */
  this._id = null;

  /**
   * @type {Object}
   * @private
   */
  this._context = context;

  /**
   * @type {Object.<number, {typeName: string, type: Function, object: Object}>}
   * @private
   */
  this._sharedObjects = {};

  var self = this;
  context.addEventListener('message', function(e) {
    self._handleMessage(e);
  });
};

/**
 * @param {{__id: number}} proxy
 * @returns {*}
 */
parallel.worker.Thread.prototype.getShared = function(proxy) { return this._sharedObjects[proxy['__id']].object; };

parallel.worker.Thread.prototype._handleMessage = function(e) {
  try {
    if (!e.data || !e.data['action']) {
      e.ports[0].postMessage({
        'threadId': this._id,
        'error': 'Unsupported message: ' + JSON.stringify(e.data)
      });
      return;
    }

    var self = this;
    var context = this._context;

    var msg = e.data;

    var result;
    var args = msg['data'] ? msg['data']['args'] : undefined;
    if (args) {
      args = args.map(function(arg) {
        return Object.getOwnPropertyDescriptor(arg, '__id') ? self.getShared(arg) : arg;
      });
    }
    switch (msg['action']) {
      case 'load':
        var file = msg['data']['file'];
        if (file != undefined) {
          importScripts(file);
        }
        /*var resource = msg['data']['resource'];
        if (resource != undefined) {
          goog.require(resource);
        }*/

        // success
        e.ports[0].postMessage({ 'threadId': this._id });
        break;
      case 'start':
        this._id = msg['threadId'];
        // success
        e.ports[0].postMessage({ 'threadId': this._id });
        break;
      case 'stop':
        e.ports[0].postMessage({ 'threadId': this._id });
        context.close(); // Terminates the worker.
        break;
      case 'call':
        var func = null;
        if ('func' in msg['data']) {
          func = eval('(' + msg['data']['func'] + ')');
        } else {
          func = u.reflection.evaluateFullyQualifiedTypeName(msg['data']['funcName'], context);
        }
        result = func.apply(null, args);
        e.ports[0].postMessage({
          'threadId': this._id,
          'data': result
        });
        break;
      case 'createShared':
        var objId = msg['data']['id'];
        var typeName = msg['data']['type'];
        var ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName, context);
        var obj = u.reflection.applyConstructor(ctor, args);
        self._sharedObjects[objId] = {typeName: typeName, type: ctor, object: obj};

        // success
        e.ports[0].postMessage({ 'threadId': this._id });
        break;

      case 'swap':
        var tuples = msg['data'];
        var newSharedObjects = {};
        var ret = tuples.map(function(tuple) {
          var obj = tuple['object'];
          var objId = tuple['id'];
          if (obj === undefined) {
            return self._sharedObjects[objId]['object'];
          }
          var typeName = tuple['type'];
          var ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName, context);
          var o = u.reflection.wrap(obj, ctor);
          newSharedObjects[objId] = {typeName: typeName, type: ctor, object: o};
          return {'__id': objId};
        });
        u.extend(self._sharedObjects, newSharedObjects);
        e.ports[0].postMessage({
          'threadId': this._id,
          'data': ret
        });
        break;

      case 'callShared':
        var shared = self._sharedObjects[msg['data']['target']];
        if (!shared) {
          e.ports[0].postMessage({
            'error': 'Shared object not found: ' + JSON.stringify(e.data)
          });
          break;
        }

        var target = shared.object;
        var method = shared.type.prototype[msg['data']['method']];
        var type = msg['data']['type'];

        switch (type) {
          case 'function':
            result = method.apply(target, args);
            break;
          case 'get':
            result = target[method];
            break;
          case 'set':
            result = undefined;
            target[method] = args[0];
            break;
        }
        e.ports[0].postMessage({
          'threadId': this._id,
          'data': result
        });

        break;
      default:
        e.ports[0].postMessage({
          'threadId': this._id,
          'error': 'Unsupported action: ' + JSON.stringify(e.data)
        });
    }
  } catch (err) {
    e.ports[0].postMessage({
      'threadId': this._id,
      'error': err.toString()
    });
    u.log.error(err);
  }
};

self['thread'] = new parallel.worker.Thread(self);
