(function(window, undefined) {

    var Injector = function(providerCache, providerSuffix) {
        this.depsRegExp = new RegExp(/\((.*)\) *\{/);
        this.providerSuffix = providerSuffix;
        this.providerCache = providerCache;
        this.instanceCache = {};
    };

    Injector.prototype.getDep = function(name) {
        if (name === '') {
            return null;
        } else if (this.providerCache[name] !== undefined) {
            return this.providerCache[name];
        } else if (this.instanceCache[name] === undefined) {
            var provider = this.providerCache[name + this.providerSuffix];
            this.instanceCache[name] = provider.$get;
        }
        var dep = this.instanceCache[name];
        if (_.isFunction(dep)) {
            return (dep.prototype !== undefined) ? this.instantiate(dep) : this.invoke(dep);
        } else {
            return dep;
        }
    };

    Injector.prototype.instantiate = function(fn) {
        var deps = this.parseDeps(fn);
        function C() {
            return fn.apply(this, deps);
        }
        C.prototype = fn.prototype;
        return new C();
    };

    Injector.prototype.invoke = function(fn, self) {
        var deps = this.parseDeps(fn);
        var scope = self || this;
        return fn.apply(scope, deps);
    };

    Injector.prototype.parseDeps = function(fn) {
        var fn_ = fn;

        var depsArray = [];
        if (_.isArray(fn)) {
            depsArray = fn.slice(0, fn.length - 1);
            fn_ = fn[fn.length - 1];
        } else {
            var matches = fn.toString().match(this.depsRegExp);
            depsArray = matches[1].split(',');
        }

        var deps = [];
        var dep = null;
        for (var i = 0; i < depsArray.length; ++i) {
            dep = this.getDep(depsArray[i].trim());
            if (dep) {
                deps.push(dep);
            }
        }
        return deps;
    };

    var Provider = function(providerInjector, providerCache, providerSuffix) {
        this.providerSuffix = providerSuffix
        this.providerCache = providerCache;
        this.providerInjector = providerInjector;
    }

    Provider.prototype.provide = function(name, fn) {
        var providerFn = fn;
        if (_.isFunction(fn) || _.isArray(fn)) {
            providerFn = this.providerInjector.instantiate(fn);
        }
        return this.providerCache[name + this.providerSuffix] = providerFn;
    }

    Provider.prototype.factory = function(name, fn) {
        return this.provide(name, {$get: fn});
    };

    Provider.prototype.service = function(name, fn) {
        self = this;
        return this.factory(name, self.providerInjector.instantiate(fn));
    };

    var ControllerProvider = function() {
        var controllers = {};
        this.register = function(name, fn) {
            controllers[name] = fn;
        }

        this.$get = function(injector) {
            return function(name) {
                injector.instantiate(controllers[name]);
            };
        };
    };

    var Module = function(name, injector) {
        this.name = name;
        this.injector = injector;
    };

    Module.prototype.controller = function(name, fn) {
        var controllerProvider = this.injector.getDep('controllerProvider');
        controllerProvider.register(name, fn);
        return this;
    };

    Module.prototype.provider = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.provide(name, fn);
        return this;
    };

    Module.prototype.service = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.service(name, fn);
        return this;
    };

    Module.prototype.factory = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.factory(name, fn);
        return this;
    };

    Module.prototype.config = function(fn) {
        this.injector.invoke(fn);
        return this;
    };

    Module.prototype.run = function(fn) {
        this.injector.invoke(fn);
        return this;
    };

    var Knockoff = function(suffix) {
        this.providerSuffix = suffix || 'Provider';
        this.providerCache = {};
        this.injector = new Injector(this.providerCache, this.providerSuffix);
        this.provider = new Provider(this.injector, this.providerCache, this.providerSuffix);
        this.provider.factory('provider', this.provider);
        this.provider.factory('injector', this.injector);
        this.provider.provide('controller', ControllerProvider);
    };

    Knockoff.prototype.module = function(name) {
        return new Module(name, this.injector);
    };

    window.Knockoff = Knockoff;

    if (typeof define === "function" && define.amd && define.amd.Knockoff) {
        define("Knockoff", [], function() { return Knockoff; });
    }
})(window);