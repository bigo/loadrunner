(function(context) {
  function makeArray(o) {
    var arr = [];
    for (var i=0, len = o.length; i < len; i++) {
      arr.push(o[i]);
    }
    return arr;
  }
  
  function indexOf(item, arr) {
    for (var i=0, len = arr.length; i < len; i++) {
      if (item == arr[i]) return i;
    }
  }
  
  function isModule(file) {
    return !!file.match(/^((\.|\.\.|[a-zA-Z0-9\-_]+)\/)*[a-zA-Z0-9\-_]+$/);
  }
  
  function getModulePath(file) {
    return [require.modulePath, file, '.js'].join('');
  }
  
  function Promise() {
    this.completed = false;
    this.callbacks = [];
  }
  
  Promise.prototype.addCallback = function(cb) {
    if (this.completed) {
      cb.apply(this, this.results);
    } else {
      this.callbacks.push(cb);
    }
  }
  
  Promise.prototype.complete = function() {
    this.results = makeArray(arguments);
    this.completed = true;
    for (var i=0, cb; cb = this.callbacks[i]; i++) {
      cb.apply(this, this.results);
    }
  } 
  
  function Module(body) {
    this.p = new Promise;
    this.exports = {};
    
    if (typeof body == 'function') {
      body(this.exports);
      this.p.complete(this);
    } else if (body instanceof Promise) {
      var self = this;
      body.addCallback(function() {
        self.exports = arguments[arguments.length-1];
        self.p.complete(self);
      });
    } else {
      this.exports = body;
      this.p.complete(this);
    }
  }
  
  var loadsInProgress = {};
  
  function load(file, callback) {
    if (!loadsInProgress[file]) {
      loadsInProgress[file] = new Promise;
      
      var fileLoaded = function() {
        loadsInProgress[file].complete(file);
        delete loadsInProgress[file];
      };

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = file;
      script.async = true;
    
      script.onload = script.onerror = fileLoaded;
      script.onreadystatechange = function () {
        if (this.readyState == 'loaded' && this.readyState == 'complete') {
          this.onreadystatechange = null;
          fileLoaded();
        }
      };
     
      var head = document.getElementsByTagName('head')[0];
      
      if (!head) {
        head = document.createElement('head');
        document.documentElement.appendChild(head);
      }
      
      head.appendChild(script);
    }
        
    if (callback) {
      loadsInProgress[file].addCallback(callback);
    }
    
    return loadsInProgress[file];
  }
  
  function require() {
    var p = new Promise,
        files = makeArray(arguments),
        completed = 0,
        modulesRequested = [];
        
    function fileLoaded() {
      completed++;
      
      if (completed == files.length) {
        var passThrough = {};
        var moduleExports = [];
        
        for (var i=0, moduleName; moduleName = modulesRequested[i]; i++) {
          moduleExports.push(modules[moduleName].exports);
        }
        
        p.complete.apply(p, moduleExports.concat(passThrough));
      }
    }
    
    function moduleFileLoadedCallback(name) {
      return function() {
        modules[name].p.addCallback(function() {
          fileLoaded();
        });
      }
    }
        
    if (typeof files[files.length-1] == 'function') {
      p.addCallback(files.pop());
    }
    
    for (var i=0, file; file = files[i]; i++) {
      if (isModule(file)) {
        var path = getModulePath(file)
        modulesRequested.push(file);
        
        if (indexOf(path, require.loaded)) {
          moduleFileLoadedCallback(file)();
        } else {
          require.loaded.push(path);
          load(path, moduleFileLoadedCallback(file));
        }
      } else {
        if (indexOf(file, require.loaded)) {
          fileLoaded();
        } else {
          require.loaded.push(file);
          load(file, fileLoaded);
        }
      }
    }
    
    return p;
  }
  
  var modules = {};
  
  require.loaded = [];
  require.modulePath = '/';
  require.reset = function() {
    require.loaded = [];
    modules = {};
  }
  
  function module(name, body) {
    return modules[name] = new Module(body);
  }
  
  context.load    = load;
  context.require = require;
  context.module  = module;
}(window));