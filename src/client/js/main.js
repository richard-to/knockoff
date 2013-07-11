var UserModel = Backbone.Model.extend({
    defaults: {
        'name': ''
    }
});

var MsgModel = Backbone.Model.extend({
    urlRoot: '/api/msgs',
    defaults: {
        'name': '',
        'msg': 'No message.'
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
    tagName: 'div',
    template: _.template($("#ko-composeview-tmpl").html()),
    initialize: function() {
        _.bindAll(this, 'render', 'submit');
    },
    events: {
        'click .ko-submit': 'submit',
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    },
    submit: function() {
        var model = new this.collection.model({
            name: this.user.get('name'),
            msg: this.$el.find('.ko-text').val()
        });
        model.save();
        this.collection.add(model);
        return false;
    }
});

knockoff.module('msgServices')
    .value('user', new UserModel({'name': 'John Doe'}))
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