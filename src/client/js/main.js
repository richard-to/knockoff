var UserModel = Backbone.Model.extend({
    urlRoot: '/api/users',
    methods: {
        'login': 'login'
    },
    defaults: {
        'name': '',
        'avatar': '',
        'isLoggedIn': false
    },
    isLoggedIn: function() {
        return this.get('isLoggedIn');
    },
    login: function(successFn, errorFn) {
        var model = this;
        return this.save({}, {
            url: this.urlRoot + "/" + this.methods.login,
            success: function(model, resp) {
                if (successFn) {
                    successFn(model, resp);
                }
            },
            error: function(model, resp) {
                if (errorFn) {
                    errorFn(model, resp);
                }
            }
        });
    }
});

var TaskModel = Backbone.Model.extend({
    defaults: {
        'description': '',
        'completed': false
    },
});

var TaskCollection = Backbone.Collection.extend({
    model: TaskModel
});

var ParentModel = function(attributes, options) {
    var opts = {};
    if (_.isObject(options)) {
        opts = options;
    } else if (_.isObject(attributes)) {
        opts = attributes;
    }
    this.child = opts.child || this.child;
    Backbone.Model.apply(this, [attributes, options]);
};

_.extend(ParentModel.prototype, Backbone.Model.prototype, {
    child: [],
    initialize: function() {
        for (var i = 0; i < this.child.length; ++i) {
            this[this.child[i] + 'List'] = new this[this.child[i] + 'Collection']();
            this[this.child[i] + 'List'].on("change", this.onChildEvent, this);
            this[this.child[i] + 'List'].on("add", this.onChildEvent, this);
            this[this.child[i] + 'List'].on("remove", this.onChildEvent, this);
        }
    },
    fetch: function(options) {
        options = options || {};
        var success = options.success || null;
        var child = this.child;
        options.success = function(model) {
            for (var i = 0; i < child.length; ++i) {
                model[child[i] + 'List'].off("add", model.onChildEvent, model);
                var attr = model.get(child[i]);
                for (var g = 0; g < attr.length; ++g) {
                    model[child[i] + 'List'].add(attr[g]);
                }
                if (success) {
                    success(response);
                }
                model[child[i] + 'List'].on("add", model.onChildEvent, model);
            }
        };
        Backbone.Model.prototype.fetch.apply(this, [options]);
    },
    onChildEvent: function(model) {
        this.save();
    },
    save: function(key, val, options) {
        for (var i = 0; i < this.child.length; ++i) {
            this.set(this.child[i], this[this.child[i] + 'List'].toJSON(), {silent:true});
        }
        Backbone.Model.prototype.save.apply(this, [key, val, options]);
    }
});
ParentModel.extend = Backbone.Model.extend;

var GoalModel = ParentModel.extend({
    child: ['tasks'],
    urlRoot: '/api/goals',
    defaults: {
        'name': '',
        'owner': false,
        'goal': '',
        'tasks': [],
        'approved': false
    },
    tasksCollection: TaskCollection,
    tasksList: null
});

var MsgModel = Backbone.Model.extend({
    urlRoot: '/api/msgs',
    methods: {
        'fetchDraft': 'draft',
        'rate': 'rate'
    },
    defaults: {
        'name': '',
        'msg': 'No message.',
        'avatar': '',
        'published': false,
        'publishDate': '',
        'rating': null,
        'owner': false,
        'collapsed': false,
        'excerpt': '',
    },
    initialize: function() {
        this.on('change:msg', function(model, msg) {
            model.set('excerpt', msg.substring(0, 60) + "...");
        });
    },
    toggleCollapse: function() {
        if (this.get('collapsed') === true) {
            this.set('collapsed', false);
        } else {
            this.set('collapsed', true);
        }
    },
    isCollapsed: function() {
        return this.get('collapsed') === true;
    },
    isUpvote: function() {
        return this.get('rating') === 1;
    },
    isDownvote: function() {
        return this.get('rating') === 0;
    },
    upvote: function(successFn, errorFn) {
        return this.rate(1, '', successFn, errorFn);
    },
    downvote: function(successFn, errorFn) {
        return this.rate(0, '', successFn, errorFn);
    },
    rate: function(rating, reason, successFn, errorFn) {
        var model = this;
        return this.save({rating: rating}, {
            url: this.urlRoot + "/" + model.id + "/" + this.methods.rate,
            success: function(model, resp) {
                if (successFn) {
                    successFn(model, resp);
                }
            },
            error: function(model, resp) {
                if (errorFn) {
                    errorFn(model, resp);
                }
            }
        });
    },
    fetchDraft: function(successFn) {
        var model = this;
        return this.fetch({
            url: this.urlRoot + "/" + this.methods.fetchDraft,
            success: successFn
        });
    }
});

var MsgList = Backbone.Collection.extend({
    url: '/api/msgs',
    model: MsgModel
});

var GoalView = knockoff.ui.EditableView.extend({
    id: 'GoalView',
    template: '#ko-tmpl-goal',
    templateEdit: '#ko-tmpl-goaledit',
    outlets: {
        content: 'goal',
        textbox: 'goal'
    }
});

var MsgItemView = knockoff.ui.ItemView.extend({
    id: 'MsgItemView',
    ctrls: {
        rating: '.ko-ctrl-rating',
        upvote: '.ko-ctrl-upvote',
        downvote: '.ko-ctrl-downvote',
        header: '.ko-ctrl-header'
    },
    actions: [
        ['upvote', 'click', 'upvote'],
        ['downvote', 'click', 'downvote'],
        ['header', 'click', 'collapse']
    ],
    syncTemplate: function() {
        return this.model.attributes;
    },
    render: function() {
        var data = this.syncTemplate();
        this.$el.html(this.template(data));

        this.renderCollapse();

        if (this.model.isUpvote()) {
            this.renderUpvote();
        } else if (this.model.isDownvote()) {
            this.renderDownvote();
        }
        return this;
    },
    collapse: function() {
        this.model.toggleCollapse();
        this.renderCollapse();
    },
    renderCollapse: function() {
        if (this.model.isCollapsed()) {
            this.$el.addClass(this.states.collapsed);
        } else {
            this.$el.removeClass(this.states.collapsed);
        }
    },
    upvote: function() {
        if (this.$el.find(this.ctrls.rating + '.' + this.states.disabled).size() > 0) {
            return;
        }
        this.model.upvote();
        this.renderUpvote();
    },
    renderUpvote: function() {
        this.$el.find(this.ctrls.rating).addClass(this.states.disabled);
        this.$el.find(this.ctrls.upvote).addClass('btn-success').addClass('disabled');
        this.$el.find(this.ctrls.upvote + ' i').addClass('icon-white');
        this.$el.find(this.ctrls.downvote).parent().hide();
    },
    downvote: function() {
        if (this.$el.find(this.ctrls.rating + '.' + this.states.disabled).size() > 0) {
            return;
        }
        this.model.downvote();
        this.renderDownvote();
    },
    renderDownvote: function() {
        this.$el.find(this.ctrls.rating).addClass(this.states.disabled);
        this.$el.find(this.ctrls.downvote).addClass('btn-danger').addClass('disabled');
        this.$el.find(this.ctrls.downvote + ' i').addClass('icon-white');
        this.$el.find(this.ctrls.upvote).parent().hide();
    }
});

var HomeView = knockoff.ui.View.extend({
    id: 'HomeView',
    inject: ['router'],
    tagName: 'div',
    template: '#ko-tmpl-home',
    initialize: function() {
        _.bindAll(this, 'render', 'link');
    },
    ctrls: {
        link: '.ko-ctrl-link'
    },
    actions: [
        ['link', 'click', 'link'],
    ],
    link: function() {
        this.router.navigate("msg", {trigger: true});
        return false;
    }
});

var LoginView = knockoff.ui.View.extend({
    id: 'LoginView',
    inject: ['router'],
    tagName: 'div',
    template: '#ko-tmpl-login',
    ctrls: {
        submit: '.ko-ctrl-submit',
        textbox: '.ko-ctrl-textbox'
    },
    actions: [
        ['submit', 'click', 'submit'],
    ],
    outlets: {
        textbox: 'name'
    },
    submit: function() {
        var router = this.router;
        var val = this.$el.find(this.ctrls.textbox).val();
        this.syncModel(this.model, 'textbox', val);
        this.model.login(function(model) {
            router.navigate('msg', {trigger: true});
        });
    }
});

var MsgComposeView = knockoff.ui.View.extend({
    id: 'MsgComposeView',
    propList: ['autosave', 'autosaveInterval', 'autosaveId'],
    tagName: 'div',
    template: '#ko-tmpl-compose',
    autosave: false,
    autosaveInterval: 10000,
    autosaveId: null,
    initialize: function() {
        _.bindAll(this, ['onFetchDraft']);
        this.model = new this.collection.model();
        this.model.fetchDraft(this.onFetchDraft);
        this.autosaveMsg();
    },
    ctrls: {
        submit: '.ko-ctrl-submit',
        textarea: '.ko-ctrl-textarea'
    },
    actions: [
        ['submit', 'click', 'submit'],
    ],
    outlets: {
        textarea: 'msg'
    },
    onFetchDraft: function(model) {
        this.$el.find(this.ctrls.textarea).val(model.get(this.outlets.textarea));
    },
    submit: function() {
        this.model.set({
            msg: this.$el.find(this.ctrls.textarea).val(),
            published: true
        });
        this.model.save();
        this.collection.add(this.model);
        this.$el.find(this.ctrls.textarea).val('');
        this.model = new this.collection.model({name: this.user.get('name')});
        this.model.fetchDraft();
        return false;
    },
    autosaveMsg: function() {
        var self = this;
        if (this.autosave) {
            this.autosaveId = setTimeout(function() {
                self.syncModel(
                    self.model, 'textarea',
                    self.$el.find(this.ctrls.textarea).val());
                self.model.save();
                self.autosaveMsg();
            }, this.autosaveInterval);
        }
    },
    remove: function() {
        clearTimeout(this.autosaveId);
        knockoff.ui.View.prototype.remove.call(this);
    }
});

var TaskItemView = knockoff.ui.CheckItemView.extend({
    outlets: {
        checkbox: 'completed',
        content: 'description',
        textbox: 'description'
    }
});

var TaskAddItemView = knockoff.ui.AddItemView.extend({
    outlets: {
        textbox: 'description'
    }
});

knockoff.module('appService')
    .value('user', new UserModel());

knockoff.module('goalService')
    .value('GoalModel', GoalModel)
    .value('GoalView', GoalView)
    .value('TaskItemView', TaskItemView)
    .value('TaskAddItemView', TaskAddItemView)
    .value('TaskView', knockoff.ui.ListView.extend({itemView: TaskItemView}));

knockoff.module('goalModule', ['viewService', 'appService', 'goalService'])
    .controller('goalController', function(env, LayoutView, GoalModel, GoalView, TaskView, TaskAddItemView) {
        var goal = new GoalModel({id: 0});
        goal.fetch();
        var goalView = new GoalView({model: goal});
        var taskView = new TaskView({collection: goal.tasksList});
        var addView = new TaskAddItemView({collection: goal.tasksList});
        var layoutView = new LayoutView({
            views: {
                "ko-view-goal": goalView,
                "ko-view-task": taskView,
                'ko-view-add': addView
            }
        });
        env.$el.html(layoutView.render().el);
    });

knockoff.module('msgService')
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('MsgListView', knockoff.ui.ListView.extend({itemView: MsgItemView}))
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['viewService', 'appService', 'msgService'])
    .controller('msgController', function(env, MsgList, LayoutView, MsgListView, MsgComposeView) {
        var msgList = new MsgList();
        msgList.fetch();

        var listView = new MsgListView({collection: msgList});
        var composeView = new MsgComposeView({collection: msgList}, ['user']);
        var layoutView = new LayoutView({
            template: '#ko-tmpl-layout',
            views: {
                "ko-view-list": listView,
                "ko-view-compose": composeView
            }
        });
        env.$el.html(layoutView.render().el);
    });

knockoff.module('mainModule', ['viewService', 'msgModule', 'goalModule'])
    .config(function(routerProvider) {
        routerProvider.add('msg', 'msg', 'mainController');
    })
    .controller('mainController', function(env, user, router, MultiControllerView) {
        if (user.isLoggedIn()) {
            var view = new MultiControllerView({
                env: env,
                template: '#ko-tmpl-main'
            });
            env.$el.html(view.render().el);
        } else {
            router.navigate('', {trigger: true});
        }
    });

knockoff.module('homeModule', ['appService'])
    .value('HomeView', HomeView)
    .value('LoginView', LoginView)
    .config(function(routerProvider) {
        routerProvider.add('', 'home', 'homeController');
    })
    .controller('homeController', function(env, user, LoginView, HomeView) {
        if (user.isLoggedIn()) {
            var homeView = new HomeView({});
            env.$el.html(homeView.render().el);
        } else {
            var loginView = new LoginView({model: user});
            env.$el.html(loginView.render().el);
        }
    });

Backbone.history.start();