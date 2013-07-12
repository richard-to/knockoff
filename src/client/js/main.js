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
        'collapsed': false
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

var MsgItemView = knockoff.ui.ListItem.extend({
    inject: ['user'],
    initialize: function() {
        _.bindAll(this, 'render', 'upvote', 'downvote');
    },
    events: {
        'click .ko-upvote': 'upvote',
        'click .ko-downvote': 'downvote',
        'click .ko-msg-header': 'collapse'
    },
    render: function() {
        var data = {
            user: this.user.attributes,
            model: this.model.attributes
        };
        this.$el.html(this.template(data));

        if (this.model.get('rating') === 1) {
            this.upvote();
        } else if (this.model.get('rating') === 0) {
            this.downvote();
        }

        if (this.model.get('collapsed') === true) {
            this.$el.addClass('collapsed');
        } else {
            this.$el.removeClass('collapsed');
        }
        return this;
    },
    collapse: function() {
        this.model.toggleCollapse();
        this.render();
    },
    upvote: function() {
        if (this.$el.find('.ko-rating.ko-disabled').size() > 0) {
            return;
        }
        this.model.upvote();
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

knockoff.module('msgServices')
    .value('LayoutView', knockoff.ui.LayoutView)
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.ui.List.extend({itemView: MsgItemView}))
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['appServices', 'msgServices'])
    .config(function(routerProvider) {
        routerProvider.add('msg', 'msg', 'msgController');
    })
    .controller('msgController', function(env, user, router, MsgList, LayoutView, ListView, MsgComposeView) {
        if (user.isLoggedIn()) {
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