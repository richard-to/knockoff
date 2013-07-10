(function(window, undefined) {

    function Value(value) {
        this.get = value;
    }

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
            this.instanceCache[name] = provider.get;
        }
        var dep = this.instanceCache[name];
        if (dep instanceof Value) {
            return dep.get;
        } else if (_.isFunction(dep)) {
            return (dep.prototype !== undefined) ? this.instantiate(dep) : this.invoke(dep);
        } else {
            return dep;
        }
    };

    Injector.prototype.instantiate = function(fn, params) {
        var deps = this.parseDeps(fn, params);
        var fn_ = this.parseFn(fn);
        function C() {
            return fn_.apply(this, deps);
        }
        C.prototype = fn_.prototype;
        return new C();
    };

    Injector.prototype.invoke = function(fn, params, self) {
        var deps = this.parseDeps(fn, params);
        var fn_ = this.parseFn(fn);
        var scope = self || this;
        return fn_.apply(scope, deps);
    };

    Injector.prototype.parseFn = function(fn) {
        var fn_ = fn;
        if (_.isArray(fn)) {
            fn_ = fn[fn.length - 1];
        }
        return fn_;
    };

    Injector.prototype.parseDeps = function(fn, params) {
        var fn_ = fn;
        var params_ = params || {};
        var depsArray = [];
        if (_.isArray(fn)) {
            depsArray = fn.slice(0, fn.length - 1);
            fn_ = fn[fn.length - 1];
        } else {
            var matches = fn.toString().match(this.depsRegExp);
            depsArray = matches[1].split(',');
        }

        var deps = [];
        var depName = null;
        var dep = null;
        for (var i = 0; i < depsArray.length; ++i) {
            depName = depsArray[i].trim();
            if (params_[depName] !== undefined) {
                dep = params_[depName];
            } else {
                dep = this.getDep(depsArray[i].trim());
            }
            if (dep) {
                deps.push(dep);
            }
        }
        return deps;
    };

    var Provider = function(providerInjector, providerCache, providerSuffix) {
        this.providerSuffix = providerSuffix;
        this.providerCache = providerCache;
        this.providerInjector = providerInjector;
    };

    Provider.prototype.provider = function(name, fn) {
        var providerFn = fn;
        if (_.isFunction(fn) || _.isArray(fn)) {
            providerFn = this.providerInjector.instantiate(fn);
        }
        this.providerCache[name + this.providerSuffix] = providerFn;
        return providerFn;
    };

    Provider.prototype.factory = function(name, fn) {
        return this.provider(name, {get: fn});
    };

    Provider.prototype.value = function(name, fn) {
        return this.factory(name, new Value(fn));
    };

    Provider.prototype.service = function(name, fn) {
        self = this;
        return this.factory(name, self.providerInjector.instantiate(fn));
    };

    var ControllerProvider = function() {
        var controllers = {};
        this.register = function(name, fn, env) {
            controllers[name] = {fn: fn, params: {}};
            if (env !== undefined) {
                controllers[name].params.env = env;
            }
        };
        this.get = function(injector) {
            return function(name) {
                var fn = controllers[name].fn;
                var params = controllers[name].params;
                injector.instantiate(fn, params);
            };
        };
    };

    var Env = function(el) {
        this.$el = el instanceof $ ? el : $(el);
        this.el = this.$el[0];
        this.name = this.$el.attr('class').split(' ')[0];
        this.parent = null;
        this.children = {};
        this.data = {};
    };

    Env.prototype.addChild = function(el) {
        var childEnv = new Env(el);
        childEnv.parent = this;
        this.children[childEnv.name] = childEnv;
        return childEnv;
    };

    Env.prototype.getData = function(name) {
        if (this.data[name] !== undefined) {
            return this.data[name];
        } else if (this.parent !== null) {
            return this.parent.getData(name);
        } else {
            return undefined;
        }
    };

    var ModuleHooks = {
        CONTROLLER: 'controller',
        PROVIDER: 'provider',
        SERVICE: 'service',
        FACTORY: 'factory',
        VALUE: 'value'
    };

    var Module = function(name, moduleDeps, env, injector) {
        this.name = name;
        this.injector = injector;
        this.env = env;
        this.isRunning = false;
        this._config = null;

        this.moduleDeps = moduleDeps || [];
        this.hooks = [];
        this.runFn = {};
        this.runFn[ModuleHooks.CONTROLLER] = _.bind(this.runController, this);
        this.runFn[ModuleHooks.PROVIDER] = _.bind(this.runProvider, this);
        this.runFn[ModuleHooks.SERVICE] = _.bind(this.runService, this);
        this.runFn[ModuleHooks.FACTORY] = _.bind(this.runFactory, this);
        this.runFn[ModuleHooks.VALUE] = _.bind(this.runValue, this);
    };

    Module.prototype.controller = function(name, fn) {
        this.hooks.push({type: ModuleHooks.CONTROLLER, name: name, fn: fn});
        return this;
    };

    Module.prototype.provider = function(name, fn) {
        this.hooks.push({type: ModuleHooks.PROVIDER, name: name, fn: fn});
        return this;
    };

    Module.prototype.service = function(name, fn) {
        this.hooks.push({type: ModuleHooks.SERVICE, name: name, fn: fn});
        return this;
    };

    Module.prototype.factory = function(name, fn) {
        this.hooks.push({type: ModuleHooks.FACTORY, name: name, fn: fn});
        return this;
    };

    Module.prototype.value = function(name, fn) {
        this.hooks.push({type: ModuleHooks.VALUE, name: name, fn: fn});
        return this;
    };

    Module.prototype.config = function(fn) {
        this._config = fn;
        return this;
    };

    Module.prototype.runController = function(name, fn) {
        var controllerProvider = this.injector.getDep('controllerProvider');
        controllerProvider.register(name, fn, this.env);
        return this;
    };

    Module.prototype.runProvider = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.provider(name, fn);
        return this;
    };

    Module.prototype.runService = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.service(name, fn);
        return this;
    };

    Module.prototype.runFactory = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.factory(name, fn);
        return this;
    };

    Module.prototype.runValue = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.value(name, fn);
        return this;
    };

    Module.prototype.runModule = function(name) {
        var moduleProvider = this.injector.getDep('moduleProvider');
        var moduleService = moduleProvider.get(this.injector);
        var module = moduleService(name);
        module.run();
        return this;
    };

    Module.prototype.runConfig = function(fn) {
        this.injector.invoke(fn);
        return this;
    };


    Module.prototype.run = function(fn) {
        if (this.isRunning === true) {
            return this;
        }

        if (this._config !== null) {
            this.runConfig(this._config);
        }

        var i = 0;
        for (i = 0; i < this.moduleDeps.length; ++i) {
            this.runModule(this.moduleDeps[i]);
        }

        var hook = null;
        for (i = 0; i < this.hooks.length; ++i) {
            hook = this.hooks[i];
            this.runFn[hook.type](hook.name, hook.fn);
        }

        if (fn !== undefined) {
            this.injector.invoke(fn);
        }

        this.isRunning = true;
        return this;
    };

    var ModuleProvider = function() {
        var moduleCache = {};
        var moduleEnv = {};
        this.register = function(name, moduleDeps, childEnv) {
            if (moduleEnv[name] === undefined) {
                moduleEnv[name] = {childEnv: childEnv, moduleDeps: moduleDeps};
            }
        };

        this.get = function(injector) {
            return function(name) {
                if (moduleCache[name] === undefined) {
                    moduleCache[name] = injector.instantiate(
                        Module, {
                            name: name,
                            moduleDeps: moduleEnv[name].moduleDeps || [],
                            env: moduleEnv[name].childEnv
                        });
                }
                return moduleCache[name];
            };
        };
    };

    var App = function(el, suffix) {
        this.rootEnv = new Env(el);
        this.providerSuffix = suffix || 'Provider';
        this.providerCache = {};
        this.injector = new Injector(this.providerCache, this.providerSuffix);
        this.provider = new Provider(this.injector, this.providerCache, this.providerSuffix);
        this.provider.factory('provider', this.provider);
        this.provider.factory('injector', this.injector);
        this.provider.factory('env', this.rootEnv);
        this.provider.provider('module', ModuleProvider);
        this.provider.provider('controller', ControllerProvider);
    };

    App.prototype.module = function(name, moduleDeps, el) {
        var moduleProvider = this.injector.getDep('moduleProvider');
        var childEnv = this.rootEnv.addChild(el);
        moduleProvider.register(name, moduleDeps, childEnv);
        var moduleService = moduleProvider.get(this.injector);
        return moduleService(name);
    };

    var Knockoff = {App: App};

    window.Knockoff = Knockoff;
    if (typeof define === "function" && define.amd) {
        define("Knockoff", [], function() { return Knockoff; });
    }
})(window);