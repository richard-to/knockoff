var MsgModel = Backbone.Model.extend({
    defaults: {
        'name': '',
        'msg': 'No message.'
    }
});

var MsgList = Backbone.Collection.extend({
    model: MsgModel
});

var MsgComposeView = Backbone.View.extend({
    tagName: 'div',
    template: _.template($("#ko-composeview-tmpl").html()),
    initialize: function() {
        _.bindAll(this, 'render', 'submit');
    },
    events: {
        'click .ko-submit': 'submit'
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
    }
});

knockoff.module('msgServices')
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.ui.List)
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['msgServices'])
    .el('.ko-test-module')
    .config(function(routerProvider) {
        routerProvider.add('help', 'help', 'msgController');
    })
    .controller('msgController', function(env, MsgList, ListView, MsgComposeView) {
        var msgList = new MsgList();
        msgList.add(new msgList.model({name: 'John Doe'}));
        env.msgList = msgList;

        var msgView = new ListView({collection: env.msgList});
        var composeView = new MsgComposeView({collection: env.msgList});
        env.$el.find(".ko-listview").html(msgView.render().el);
        env.$el.find(".ko-composeview").html(composeView.render().el);
    });

Backbone.history.start();