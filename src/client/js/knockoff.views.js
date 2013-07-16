(function(window, undefined) {

    if (window.knockoff === undefined) {
        throw new Error('Knockoff library is undefined!');
    }

    var knockoff = window.knockoff;

    var MixinConfigureProps = function(options, propList) {
        if (this.options) options = _.extend({}, _.result(this, 'options'), options);
        _.extend(this, _.pick(options, propList));
    };

    var MixinActionsToEvents = function() {
        var events = {};
        var actions = this.actions || [];
        if (_.isFunction(actions)) actions = actions();
        var length = actions.length;
        var action = null;
        for (var i = 0; i < length; ++i) {
            action = actions[i];
            events[action[1] + ' ' + this.ctrls[action[0]]] = action[2];
        }
        this.events = _.extend(this.events, events);
    };

    var MixinStates = function() {
        this.states = this.states || {};
        this.states = _.extend({
            disabled: 'ko-state-disabled',
            collapsed: 'ko-state-collapsed'
        }, this.states);
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

        this.ctrls = options.ctrls || this.ctrls;
        if (_.isFunction(this.ctrls)) this.ctrls = this.ctrls();

        this.actions = options.actions || this.actions;
        this.outlets = options.outlets || this.outlets;

        MixinActionsToEvents.apply(this, []);

        this.states = options.states || this.states;
        MixinStates.apply(this, []);

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
        ctrls: {},
        actions: [],
        outlets: {},
        render: function() {
            var data = this.syncTemplate();
            this.$el.html(this.template(data));
            return this;
        },
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
        },
        syncTemplate: function() {
            var output = {};
            var data = {};
            if (this.model) {
                data = this.model.attributes;
            }

            var outlets = this.outlets;
            var attr = null;
            var val = null;
            for (var name in outlets) {
                attr = outlets[name] || null;
                val = data[attr] || null;
                output[name] = val || null;
            }
            return output;
        },
        syncModel: function(model, name, value) {
            var attr = this.outlets[name];
            if (attr) {
                model.set(attr, value);
            }
            return model;
        }
    });
    View.extend = Backbone.View.extend;

    var MultiControllerView = View.extend({
        propList: ['env', 'controllers', 'wrapperTag', 'controllerSuffix', 'controllerAttr'],
        inject: ['controller'],
        wrapperTag: 'div',
        controllerSuffix: 'Controller',
        controllerAttr: 'data-controller',
        controllers: null,
        render: function() {
            var viewClass = null;
            var childEnv = null;
            var childEl = null;
            if (this.template !== undefined) {
                this.$el.html(this.template());
                if (this.controllers === null) {
                    var self = this;
                    this.$el.find('[' + this.controllerAttr + ']').each(function(index) {
                        var name =  $(this).attr(self.controllerAttr) + self.controllerSuffix;
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
        template: '#ko-tmpl-item',
        syncTemplate: function() {
            return this.model.attributes;
        },
        render: function() {
            var data = this.syncTemplate();
            this.$el.html(this.template(data));
            return this;
        }
    });

    var EditableView = View.extend({
        propList: ['templateEdit'],
        tagName: 'div',
        template: '#ko-tmpl-editable',
        templateEdit: '#ko-tmpl-editableedit',
        ctrls: {
            content: '.ko-ctrl-content',
            textbox: '.ko-ctrl-textbox',
            save: '.ko-ctrl-save'
        },
        actions: [
            ['content', 'click', 'renderEdit'],
            ['textbox', 'blur', 'blur'],
            ['save', 'mousedown', 'lock'],
            ['save', 'click', 'save'],
        ],
        outlets: {
            content: null,
            textbox: null
        },
        editMode: false,
        editModeLock: false,
        initialize: function() {
            if (this.model) {
                this.listenTo(this.model, 'change', this.render);
            }
        },
        render: function() {
            this.exitEditMode();
            this.unlock();
            var data = this.syncTemplate();
            this.$el.html(this.template(data));
            return this;
        },
        renderEdit: function() {
            this.enterEditMode();
            this.unlock();
            var data = this.syncTemplate();
            this.$el.html(this.templateEdit(data));
            this.$el.find(this.ctrls.textbox).focus();
            return this;
        },
        blur: function() {
            if (this.isUnlocked()) {
                this.render();
            }
        },
        save: function() {
            var textbox = this.$el.find(this.ctrls.textbox);
            var val = textbox.val();
            if (val !== '') {
                this.syncModel(this.model, 'textbox', val);
                this.render();
            } else {
                textbox.focus();
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

    var AddItemView = EditableView.extend({
        save: function() {
            var textbox = this.$el.find(this.ctrls.textbox);
            var val = textbox.val();
            if (val !== '') {
                var model = new this.collection.model();
                this.syncModel(model, 'textbox', val);
                this.collection.add(model);
                this.render();
            } else {
                textbox.focus();
            }
            this.unlock();
        },
    });

    var CheckItemView = EditableView.extend({
        tagName: 'li',
        template: '#ko-tmpl-checkitem',
        templateEdit: '#ko-tmpl-checkitemedit',
        ctrls: function() {
            return _.extend(EditableView.prototype.ctrls, {
                checkbox: '.ko-ctrl-checkbox',
                destroy: '.ko-ctrl-destroy'
            });
        },
        actions: function() {
            return EditableView.prototype.actions.concat([
                ['checkbox', 'click', 'check'],
                ['checkbox', 'mousedown', 'lock'],
                ['destroy', 'click', 'destroy'],
                ['destroy', 'mousedown', 'lock'],
            ]);
        },
        outlets: {
            content: null,
            checkbox: null
        },
        syncTemplate: function() {
            var output = EditableView.prototype.syncTemplate.call(this);
            output._checkbox = '';
            if (output.checkbox === true) {
                output._checkbox = 'checked="checked"';
            }
            return output;
        },
        check: function() {
            this.model.set(this.outlets.checkbox, true);
            this.$el.find(this.ctrls.checkbox).addClass('ko-checked');
            this.unlock();
            if (this.isEditMode()) {
                this.render();
            }
        },
        destroy: function() {
            this.trigger('delete', this.model);
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
            view.on('delete', this.deleteItem, this);
            this.$el.append(view.render().el);
        },
        deleteItem: function(item) {
            this.collection.remove(item);
        }
    });

    knockoff.ui = {
        View: View,
        LayoutView: LayoutView,
        ListView: ListView,
        ItemView: ItemView,
        EditableView: EditableView,
        AddItemView: AddItemView,
        CheckItemView: CheckItemView,
        MultiControllerView: MultiControllerView
    };

    knockoff.module('viewService')
        .value('View', View)
        .value('LayoutView', LayoutView)
        .value('MultiControllerView', MultiControllerView)
        .value('ListView', ListView)
        .value('ItemView', ItemView)
        .value('EditableView', EditableView)
        .value('CheckItemView', CheckItemView)
        .value('AddItemView', AddItemView);

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
})(window);