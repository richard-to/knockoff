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
        _.bindAll(this, 'render');
    },
    render: function() {
        this.$el.html(this.template());
        return this;
    }
});

knockoff.module('msgServices')
    .value('MsgModel', MsgModel)
    .value('MsgList', MsgList)
    .value('ListView', knockoff.view.List)
    .value('MsgComposeView', MsgComposeView);

knockoff.module('msgModule', ['msgServices'])
    .el('.ko-test-module')
    .config(function(routerProvider) {
        routerProvider.add('help', 'help', 'msgController');
    })
    .controller('msgController', function(env, MsgList, ListView, MsgComposeView) {
        var msgList = new MsgList();
        msgList.add(new msgList.model({name: 'John Doe'}));

        var msgView = new ListView({collection: msgList});
        var composeView = new MsgComposeView({collection: msgList});

        env.msgList = msgList;
        env.$el.find(".ko-listview").html(msgView.render().el);
        env.$el.find(".ko-composeview").html(composeView.render().el);
    });

Backbone.history.start();