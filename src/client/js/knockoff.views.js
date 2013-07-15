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
        if (_.isString(this.template)) {
            this.template =  _.template($(this.template).html());
        }

        var propList = this.propList;
        var propListLength = propList.length;
        var prop = null;
        for (var g = 0; g < propListLength; ++g) {
            prop = propList[g];
            if (prop.indexOf('template') === 0) {
                this[prop] = options[prop] || this[prop];
                if (_.isString(this[prop])) {
                    this[prop] =  _.template($(this[prop]).html());
                }
            }
        }

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
        propList: ['env', 'controllers', 'wrapperTag', 'ctrlSuffix', 'ctrlAttr'],
        inject: ['controller'],
        wrapperTag: 'div',
        ctrlSuffix: 'Controller',
        ctrlAttr: 'data-ctrl',
        controllers: null,
        render: function() {
            var viewClass = null;
            var childEnv = null;
            var childEl = null;
            if (this.template !== undefined) {
                this.$el.html(this.template());
                if (this.controllers === null) {
                    var self = this;
                    this.$el.find('[' + this.ctrlAttr + ']').each(function(index) {
                        var name =  $(this).attr(self.ctrlAttr) + self.ctrlSuffix;
                        self.renderController(name, $(this));
                    });
                } else {
                    for (viewClass in this.controllers) {
                        childEl = this.$el.find('.' + viewClass).first();
                        this.renderController(this.controllers[viewClass], childEl);
                    }
                }
            } else {
                for (viewClass in this.controllers) {
                    childEl = $("<" + this.wrapperTag + "/>");
                    childEl.addClass(viewClass);
                    this.$el.append(childEl);
                    this.renderController(this.controllers[viewClass], childEl);
                }
            }
            return this;
        },
        renderController: function(name, childEl) {
            var childEnv = this.env.addChild();
            childEnv.setEl(childEl);
            this.controller(name, {env: childEnv});
        },
        remove: function() {

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

    var ItemView = View.extend({
        tagName: 'li',
        template: '#ko-item-tmpl',
        render: function() {
            this.$el.html(this.template(this.model.attributes));
            return this;
        }
    });

    var AddItemView = View.extend({
        propList: ['templateEdit'],
        tagName: 'div',
        template: '#ko-additem-tmpl',
        templateEdit: '#ko-additemedit-tmpl',
        events: {
            'click .ko-description': 'renderEdit',
            'blur .ko-input': 'blur',
            'mousedown .ko-save': 'lock',
            'click .ko-save': 'save'
        },
        editMode: false,
        editModeLock: false,
        render: function() {
            this.exitEditMode();
            this.unlock();
            var data = {};
            if (this.model) {
                data = this.model.attributes;
            }
            this.$el.html(this.template(data));
            return this;
        },
        renderEdit: function() {
            this.enterEditMode();
            this.unlock();
            var data = {};
            if (this.model) {
                data = this.model.attributes;
            }
            this.$el.html(this.templateEdit(data));
            this.$el.find('.ko-input').focus();
            return this;
        },
        blur: function() {
            if (this.isUnlocked()) {
                this.render();
            }
        },
        save: function() {
            var val = this.$el.find('.ko-input').val();
            if (val !== '') {
                var model = new this.collection.model({
                    'description': this.$el.find('.ko-input').val()
                });
                this.collection.add(model);
                this.render();
            } else {
                this.$el.find('.ko-input').focus();
            }
            this.unlock();
        },
        isEditMode: function() {
            return this.editMode === true;
        },
        enterEditMode: function() {
            this.editMode = true;
        },
        exitEditMode: function() {
            this.editMode = false;
        },
        isUnlocked: function() {
            return this.editModeLock === false;
        },
        lock: function() {
            this.editModeLock = true;
        },
        unlock: function() {
            this.editModeLock = false;
        },
    });

    var CheckItemView = AddItemView.extend({
        tagName: 'li',
        template: '#ko-checkitem-tmpl',
        templateEdit: '#ko-checkitemedit-tmpl',
        events: {
            'click .ko-checkbox': 'check',
            'mousedown .ko-checkbox': 'lock',
            'click .ko-description': 'renderEdit',
            'blur .ko-input': 'blur',
            'mousedown .ko-save': 'lock',
            'click .ko-save': 'save',
            'click .ko-delete': 'delete',
            'mousedown .ko-delete': 'lock',
        },
        check: function() {
            this.model.set('completed', true);
            this.$el.find('.ko-description').addClass('completed');
            this.unlock();
            if (this.isEditMode()) {
                this.render();
            }
        },
        save: function() {
            var val = this.$el.find('.ko-input').val();
            if (val !== '') {
                this.model.set('description', this.$el.find('.ko-input').val());
                this.render();
            } else {
                this.$el.find('.ko-input').focus();
            }
            this.unlock();
        },
        delete: function() {
            this.remove();
        }
    });

    var ListView = View.extend({
        propList: ['itemView'],
        tagName: 'ul',
        itemView: ItemView,
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
                model: item,
            });
            this.$el.append(view.render().el);
        }
    });

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
        Layout: LayoutView,
        List: ListView,
        Item: ItemView,
        CheckItem: CheckItemView,
        AddItem: AddItemView,
        MultiController: MultiControllerView
    };
})(window);