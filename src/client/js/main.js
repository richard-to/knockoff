var MsgModel = Backbone.Model.extend({
    defaults: {
        'name': '',
        'msg': 'No message.'
    }
});

var MsgList = Backbone.Collection.extend({
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
    propList: ['router'],
    tagName: 'div',
    template: _.template($("#ko-composeview-tmpl").html()),
    initialize: function() {
        _.bindAll(this, 'render', 'submit', 'link');
    },
    events: {
        'click .ko-submit': 'submit',
        'click .ko-link': 'link'
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    submit: function() {
        this.collection.add(new this.collection.model({
            msg: this.$el.find('.ko-text').val()
        }));
        return false;
    },
    link: function() {
        this.router.navigate('', {trigger: true});
        return false;
    }
});

knockoff.module('msgServices')
    .value('LayoutView', knockoff.ui.LayoutView)
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.ui.List)
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['msgServices'])
    .config(function(routerProvider) {
        routerProvider.add('help', 'help', 'msgController');
    })
    .controller('msgController', function(env, MsgList, LayoutView, ListView, MsgComposeView) {
        var msgList = new MsgList();
        msgList.add(new msgList.model({name: 'John Doe'}));
        env.msgList = msgList;

        var listView = new ListView({collection: env.msgList});
        var composeView = new MsgComposeView({collection: env.msgList}, ['router']);
        var layoutView = new LayoutView({
            views: {
                "ko-listview": listView,
                "ko-composeview": composeView
            }
        });

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