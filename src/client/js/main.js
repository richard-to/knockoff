var UserModel = Backbone.Model.extend({
    defaults: {
        'name': ''
    }
});

var MsgModel = Backbone.Model.extend({
    urlRoot: '/api/msgs',
    methods: {
        'fetchDraft': 'draft'
    },
    defaults: {
        'name': '',
        'msg': 'No message.',
        'published': false
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

var HomeView = knockoff.ui.View.extend({
    propList: ['router'],
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
        this.router.navigate("help", {trigger: true});
        return false;
    }
});

var MsgComposeView = knockoff.ui.View.extend({
    propList: ['autosave'],
    tagName: 'div',
    template: _.template($("#ko-composeview-tmpl").html()),
    autosave: true,
    autosaveInterval: 10000,
    initialize: function() {
        _.bindAll(this, 'render', 'submit', 'autosaveMsg', 'onFetchDraft');
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

knockoff.module('msgServices')
    .value('user', new UserModel({'name': 'John Doe'}))
    .value('LayoutView', knockoff.ui.LayoutView)
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.ui.List)
    .value('MsgComposeView', MsgComposeView.extend({'autosave': false}));

knockoff.module('msgModule', ['msgServices'])
    .config(function(routerProvider) {
        routerProvider.add('msg', 'msg', 'msgController');
    })
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
        }, ['router']);
        layoutView.addEvents([{
            event: 'click .ko-link',
            name: 'link',
            fn: function() {
                this.router.navigate('', {trigger: true});
                return false;
            }
        }]);

        env.$el.html(layoutView.render().el);
    });

knockoff.module('homeModule')
    .value('HomeView', HomeView)
    .config(function(routerProvider) {
        routerProvider.add('', 'home', 'homeController');
    })
    .controller('homeController', function(env, HomeView) {
        var homeView = new HomeView({}, ['router']);
        env.$el.html(homeView.render().el);
    });

Backbone.history.start();