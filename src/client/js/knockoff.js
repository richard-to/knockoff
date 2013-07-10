(function(window, undefined) {

    var MixinConfigureProps = function(options, propList) {
        if (this.options) options = _.extend({}, _.result(this, 'options'), options);
        _.extend(this, _.pick(options, propList));
    };

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
        if (_.isFunction(dep)) {
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

    var Module = function(name, env, injector) {
        this.name = name;
        this.injector = injector;
        this.env = env;
    };

    Module.prototype.controller = function(name, fn) {
        var controllerProvider = this.injector.getDep('controllerProvider');
        controllerProvider.register(name, fn, this.env);
        return this;
    };

    Module.prototype.provider = function(name, fn) {
        var provider = this.injector.getDep('provider');
        provider.provider(name, fn);
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

    var ModuleProvider = function() {
        var moduleCache = {};
        var moduleEnv = {};
        this.register = function(name, childEnv) {
            moduleEnv[name] = childEnv;
        };

        this.get = function(injector) {
            return function(name) {
                if (moduleCache[name] === undefined) {
                    moduleCache[name] = injector.instantiate(
                        Module, {name: name, env: moduleEnv[name]});
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

    App.prototype.module = function(name, el) {
        var moduleProvider = this.injector.getDep('moduleProvider');
        var childEnv = this.rootEnv.addChild(el);
        moduleProvider.register(name, childEnv);
        var moduleService = moduleProvider.get(this.injector);
        return moduleService(name);
    };

    var ListItemView = Backbone.View.extend({
        tagName: 'li',
        template: _.template($("#ko-listitemview-tmpl").html()),
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            this.$el.html(this.template(this.model.attributes));
            return this;
        }
    });

    var ListView = function(options) {
        var propList = ['itemView'];
        options = options || {};
        this._configureProps(options || {}, propList);
        Backbone.View.apply(this, [options]);
    };

    _.extend(ListView.prototype, Backbone.View.prototype, {
        tagName: 'ul',
        itemView: ListItemView,
        initialize: function() {
            _.bindAll(this, 'render', 'appendItem');
            this.collection.on('add', this.appendItem);
        },
        render: function() {
            var self = this;
            _(this.collection.models).each(function(item) {
                self.appendItem(item);
            }, this);
            return this;
        },
        appendItem: function(item) {
            var view = new this.itemView({
                model: item
            });
            this.$el.append(view.render().el);
        },
        _configureProps: MixinConfigureProps
    });
    ListView.extend = Backbone.View.extend;

    var View = {
        List: ListView,
        ListItem: ListItemView
    };

    var Knockoff = {
        App: App,
        View: View
    };
    window.Knockoff = Knockoff;

    if (typeof define === "function" && define.amd && define.amd.Knockoff) {
        define("Knockoff", [], function() { return Knockoff; });
    }
})(window);