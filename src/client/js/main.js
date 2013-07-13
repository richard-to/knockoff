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
        'completed': false,
        'checked': ''
    },
    initialize: function() {
        this.on('change', this.syncChecked, this);
    },
    syncChecked: function() {
        var completed = this.get('completed');
        if (completed) {
            this.set('checked', 'checked="checked"');
        } else {
            this.set('checked', '');
        }
    }
});

var TaskCollection = Backbone.Collection.extend({
    model: TaskModel
});

var GoalModel = Backbone.Model.extend({
    urlRoot: '/api/goals',
    defaults: {
        'name': '',
        'owner': false,
        'goal': '',
        'tasks': [],
        'approved': false
    },
    methods: {

    },
    taskCollection: TaskCollection,
    taskList: null,
    initialize: function() {
        this.taskList = new this.taskCollection();
        this.on('change', this.syncTasks, this);
        this.taskList.on('add', this.saveTasks, this);
        this.taskList.on('change', this.saveTasks, this);
        this.taskList.on('remove', this.saveTasks, this);
    },
    ignoreChangeEvent: false,
    saveTasks: function() {
        if (this.ignoreChangeEvent === false) {
            this.ignoreChangeEvent = true;
            this.set('tasks', this.taskList.toJSON());
            this.save();
            this.ignoreChangeEvent = false;
        }
    },
    syncTasks: function() {
        if (this.ignoreChangeEvent === false) {
            var tasks = this.get('tasks');
            this.ignoreChangeEvent = true;
            for (var i = 0; i < tasks.length; ++i) {
                this.taskList.add(tasks[i]);
            }
            this.ignoreChangeEvent = false;
        }
    }
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

var GoalView = knockoff.ui.View.extend({
    tagName: 'div',
    template: _.template($("#ko-goalview-tmpl").html()),
    render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    }
});


var MsgItemView = knockoff.ui.ListItem.extend({
    events: {
        'click .ko-upvote': 'upvote',
        'click .ko-downvote': 'downvote',
        'click .ko-msg-header': 'collapse'
    },
    render: function() {
        this.$el.html(this.template(this.model.attributes));

        this.renderCollapse();

        if (this.model.get('rating') === 1) {
            this.renderUpvote();
        } else if (this.model.get('rating') === 0) {
            renderDhis.dow();
        }
        return this;
    },
    collapse: function() {
        this.model.toggleCollapse();
        this.renderCollapse();
    },
    renderCollapse: function() {
        if (this.model.get('collapsed') === true) {
            this.$el.addClass('collapsed');
        } else {
            this.$el.removeClass('collapsed');
        }
    },
    upvote: function() {
        if (this.$el.find('.ko-rating.ko-disabled').size() > 0) {
            return;
        }
        this.model.upvote();
        this.renderUpvote();
    },
    renderUpvote: function() {
        this.$el.find('.ko-rating').addClass('ko-disabled');
        this.$el.find('.ko-upvote').addClass('btn-success').addClass('disabled');
        this.$el.find('.ko-upvote i').addClass('icon-white');
        this.$el.find('.ko-downvote').parent().hide();
    },
    downvote: function() {
        if (this.$el.find('.ko-rating.ko-disabled').size() > 0) {
            return;
        }
        this.model.downvote();
        renderDhis.dow();
    },
    renderDownvote: function() {
        this.$el.find('.ko-rating').addClass('ko-disabled');
        this.$el.find('.ko-downvote').addClass('btn-danger').addClass('disabled');
        this.$el.find('.ko-downvote i').addClass('icon-white');
        this.$el.find('.ko-upvote').parent().hide();
    }
});

var HomeView = knockoff.ui.View.extend({
    inject: ['router'],
    tagName: 'div',
    template: _.template($("#ko-home-tmpl").html()),
    initialize: function() {
        _.bindAll(this, 'render', 'link');
    },
    events: {
        'click .ko-link': 'link'
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    link: function() {
        this.router.navigate("msg", {trigger: true});
        return false;
    }
});

var LoginView = knockoff.ui.View.extend({
    inject: ['router'],
    tagName: 'div',
    template: _.template($("#ko-loginview-tmpl").html()),
    events: {
        'click .ko-submit': 'submit'
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    submit: function() {
        var router = this.router;
        this.model.set('name', this.$el.find('.ko-username-input').val());
        this.model.login(function(model) {
            router.navigate('msg', {trigger: true});
        });
    }
});

var MsgComposeView = knockoff.ui.View.extend({
    propList: ['autosave', 'autosaveInterval'],
    tagName: 'div',
    template: _.template($("#ko-composeview-tmpl").html()),
    autosave: false,
    autosaveInterval: 10000,
    initialize: function() {
        _.bindAll(this, ['onFetchDraft']);
        this.model = new this.collection.model();
        this.model.fetchDraft(this.onFetchDraft);
        this.autosaveMsg();
    },
    events: {
        'click .ko-submit': 'submit',
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    onFetchDraft: function(model) {
        this.$el.find('.ko-text').val(model.get('msg'));
    },
    submit: function() {
        this.model.set({
            msg: this.$el.find('.ko-text').val(),
            published: true
        });
        this.model.save();
        this.collection.add(this.model);
        this.$el.find('.ko-text').val('');
        this.model = new this.collection.model({name: this.user.get('name')});
        this.model.fetchDraft();
        return false;
    },
    autosaveMsg: function() {
        var self = this;
        if (this.autosave) {
            setTimeout(function() {
                self.model.save({'msg': self.$el.find('.ko-text').val()});
                self.autosaveMsg();
            }, this.autosaveInterval);
        }
    }
});

knockoff.module('appServices')
    .value('user', new UserModel());

knockoff.module('goalServices')
    .value('LayoutView', knockoff.ui.LayoutView)
    .value('GoalModel', GoalModel)
    .value('GoalView', GoalView)
    .value('AppendListItemView', knockoff.ui.AppendListItem)
    .value('CheckListView', knockoff.ui.List.extend({itemView: knockoff.ui.CheckListItem}));

knockoff.module('goalModule', ['appServices', 'goalServices'])
    .controller('goalController', function(env, LayoutView, GoalModel, GoalView, CheckListView, AppendListItemView) {
        var goal = new GoalModel({id: 0});
        goal.fetch();
        var goalView = new GoalView({model: goal});
        var checkListView = new CheckListView({collection: goal.taskList});
        var appendView = new AppendListItemView({collection: goal.taskList});
        var layoutView = new LayoutView({
            className: 'ko-goaltask-view',
            views: {
                "ko-goalview": goalView,
                "ko-taskview": checkListView,
                'ko-appendview': appendView
            }
        });
        env.$el.html(layoutView.render().el);
    });

knockoff.module('msgServices')
    .value('LayoutView', knockoff.ui.LayoutView)
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.ui.List.extend({itemView: MsgItemView}))
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['appServices', 'msgServices'])
    .controller('msgController', function(env, MsgList, LayoutView, ListView, MsgComposeView) {
        var msgList = new MsgList();
        msgList.fetch();

        var listView = new ListView({collection: msgList});
        var composeView = new MsgComposeView({collection: msgList}, ['user']);
        var layoutView = new LayoutView({
            template: _.template($("#ko-layoutview-tmpl").html()),
            views: {
                "ko-listview": listView,
                "ko-composeview": composeView
            }
        });
        env.$el.html(layoutView.render().el);
    });

knockoff.module('mainModule', ['msgModule', 'goalModule'])
    .value('MultiControllerView', knockoff.ui.MultiController)
    .config(function(routerProvider) {
        routerProvider.add('msg', 'msg', 'mainController');
    })
    .controller('mainController', function(env, user, router, MultiControllerView) {
        if (user.isLoggedIn()) {
            var view = new MultiControllerView({
                env: env,
                template: _.template($("#ko-main-tmpl").html())
            });
            env.$el.html(view.render().el);
        } else {
            router.navigate('', {trigger: true});
        }
    });

knockoff.module('homeModule', ['appServices'])
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