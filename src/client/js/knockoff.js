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
        this.register = function(name, fn, moduleDeps) {
            controllers[name] = {fn: fn};
            if (moduleDeps !== undefined) {
                controllers[name].moduleDeps = moduleDeps;
            }
        };
        this.get = function(injector) {
            return function(name, vars) {
                var meta = controllers[name];
                var params = {};

                if (meta.moduleDeps !== undefined) {
                    meta.moduleDeps.run();
                    params.env = meta.moduleDeps.env;
                }

                if (vars !== undefined) {
                    _.extend(params, vars);
                }

                var fn = meta.fn;
                return injector.instantiate(fn, params);
            };
        };
    };

    var Env = function() {
        this.name = _.uniqueId('env_');
        this.parent = null;
        this.children = {};
        this.data = {};
    };

    Env.prototype.setEl = function(el) {
        this.$el = el instanceof $ ? el : $(el);
        this.el = this.$el[0];
    };

    Env.prototype.addChild = function() {
        var childEnv = new Env();
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
        PROVIDER: 'provider',
        SERVICE: 'service',
        FACTORY: 'factory',
        VALUE: 'value'
    };

    var Module = function(name, moduleDeps, env, injector) {
        this.name = name;
        this.injector = injector;
        this.env = env;
        this.env.setEl('.ko-view');
        this.isRunning = false;

        this.moduleDeps = moduleDeps || [];
        this.hooks = [];
        this.runFn = {};
        this.runFn[ModuleHooks.PROVIDER] = _.bind(this.runProvider, this);
        this.runFn[ModuleHooks.SERVICE] = _.bind(this.runService, this);
        this.runFn[ModuleHooks.FACTORY] = _.bind(this.runFactory, this);
        this.runFn[ModuleHooks.VALUE] = _.bind(this.runValue, this);
    };

    Module.prototype.el = function(el) {
        this.env.setEl(el);
        return this;
    };

    Module.prototype.config = function(fn) {
        this.injector.invoke(fn);
        return this;
    };

    Module.prototype.controller = function(name, fn) {
        var controllerProvider = this.injector.getDep('controllerProvider');
        controllerProvider.register(name, fn, this);
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

    Module.prototype.run = function(fn) {
        if (this.isRunning === false) {

            var i = 0;
            for (i = 0; i < this.moduleDeps.length; ++i) {
                this.runModule(this.moduleDeps[i]);
            }

            var hook = null;
            for (i = 0; i < this.hooks.length; ++i) {
                hook = this.hooks[i];
                this.runFn[hook.type](hook.name, hook.fn);
            }
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

        this.has = function(name) {
            return (moduleEnv[name] !== undefined);
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

    var Knockoff = function() {
        this.rootEnv = new Env();
        this.providerSuffix = 'Provider';
        this.providerCache = {};
        this.injector = new Injector(this.providerCache, this.providerSuffix);
        this.provider = new Provider(this.injector, this.providerCache, this.providerSuffix);
        this.provider.factory('provider', this.provider);
        this.provider.factory('injector', this.injector);
        this.provider.factory('env', this.rootEnv);
        this.provider.provider('module', ModuleProvider);
        this.provider.provider('controller', ControllerProvider);
    };

    Knockoff.prototype.module = function(name, moduleDeps) {
        var moduleProvider = this.injector.getDep('moduleProvider');
        if (moduleProvider.has(name) === false) {
            var childEnv = this.rootEnv.addChild();
            moduleProvider.register(name, moduleDeps, childEnv);
        }
        var moduleService = moduleProvider.get(this.injector);
        return moduleService(name);
    };

    var knockoff = new Knockoff();

    window.knockoff = knockoff;
    if (typeof define === "function" && define.amd) {
        define("knockoff", [], function() { return knockoff; });
    }
})(window);