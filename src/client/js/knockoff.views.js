(function(window, undefined) {

    if (window.knockoff === undefined) {
        throw new Error('Knockoff library is undefined!');
    }

    var knockoff = window.knockoff;

    var MixinConfigureProps = function(options, propList) {
        if (this.options) options = _.extend({}, _.result(this, 'options'), options);
        _.extend(this, _.pick(options, propList));
    };

    var View = function(options, inject) {
        this.injector = knockoff.injector;

        options = options || {};

        this.inject = _.union(this.inject || [], inject || []);
        for (var i = 0; i < this.inject.length; ++i) {
            options[this.inject[i]] = this.injector.getDep(this.inject[i]);
        }

        options.propList = options.propList || [];
        this.propList = _.union(this.propList, options.propList, this.inject);

        this.template = options.template || this.template;

        MixinConfigureProps.apply(this, [options, this.propList]);
        Backbone.View.apply(this, [options]);
    };
    _.extend(View.prototype, Backbone.View.prototype, {
        propList: [],
        template: undefined,
        events: {},
        addEvents: function(events, name, fn) {
            if (_.isArray(events)) {
                for (var i = 0; i < events.length; ++i) {
                    this.events[events[i].event] = events[i].name;
                    this[events[i].name] = events[i].fn;
                }
            } else {
                this.events[events] = name;
                this[name] = fn;
            }
            this.delegateEvents();
        }
    });
    View.extend = Backbone.View.extend;

    var MultiControllerView = View.extend({
        propList: ['env', 'controllers', 'wrapperTag'],
        inject: ['controller'],
        wrapperTag: 'div',
        controllers: {},
        render: function() {
            var viewClass = null;
            if (this.template !== undefined) {
                this.$el.html(this.template());
                for (viewClass in this.views) {
                    this.$el.find('.' + viewClass).append(this.views[viewClass].render().el);
                }
            } else {
                var childEnv = null;
                var childEl = null;
                for (viewClass in this.controllers) {
                    childEl = $("<" + this.wrapperTag + "/>");
                    childEl.addClass(viewClass);
                    this.$el.append(childEl);
                    childEnv = this.env.addChild();
                    childEnv.setEl(childEl);
                    this.controller(this.controllers[viewClass], {env: childEnv});
                }
            }
            return this;
        },
        remove: function() {
            _.each(this.views, function(view, index, list) {
                view.remove();
            }, this);

          this.$el.remove();
          this.stopListening();

          return this;
        }
    });

    var LayoutView = View.extend({
        propList: ['views', 'wrapperTag'],
        wrapperTag: 'div',
        views: {},
        render: function() {
            var viewClass = null;
            if (this.template !== undefined) {
                this.$el.html(this.template());
                for (viewClass in this.views) {
                    this.$el.find('.' + viewClass).append(this.views[viewClass].render().el);
                }
            } else {
                var childEl;
                for (viewClass in this.views) {
                    childEl = $("<" + this.wrapperTag + "/>");
                    childEl.addClass(viewClass);
                    childEl.append(this.views[viewClass].render().el);
                    this.$el.append(childEl);
                }
            }
            return this;
        },
        remove: function() {
            _.each(this.views, function(view, index, list) {
                view.remove();
            }, this);

          this.$el.remove();
          this.stopListening();

          return this;
        }
    });

    var ListItemView = View.extend({
        tagName: 'li',
        template: _.template($("#ko-listitemview-tmpl").html()),
        render: function() {
            this.$el.html(this.template(this.model.attributes));
            return this;
        }
    });

    var ListView = View.extend({
        propList: ['itemView'],
        tagName: 'ul',
        itemView: ListItemView,
        initialize: function() {
            this.collection.on('add', this.appendItem, this);
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
        }
    });
    ListView.extend = View.extend;

    knockoff.provider.provider('router', function(controller) {
        var controllerLoader = controller;
        var router = new Backbone.Router();
        var view = null;
        this.add = function(route, name, controllerName) {
            router.route(route, name, function() {
                controllerLoader(controllerName);
            });
        };

        this.get = function() {
            return router;
        };
    });

    knockoff.ui = {
        View: View,
        LayoutView: LayoutView,
        List: ListView,
        ListItem: ListItemView,
        MultiController: MultiControllerView
    };
})(window);