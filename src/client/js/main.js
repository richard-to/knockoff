var TestModel = Backbone.Model.extend({
    defaults: {
        'name': '',
        'msg': 'No message.'
    }
});

var TestList = Backbone.Collection.extend({
    model: TestModel
});

var TestComposeView = Backbone.View.extend({
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

var app = new Knockoff.App(".ko-app");

app.module('testServices', [], '.ko-test-module');
app.module('testServices').value('TestModel', TestModel)
.value('TestList', TestList)
.value('ListView', Knockoff.View.List)
.value('ComposeView', TestComposeView);

var testModule = app.module('testModule', ['testServices'], '.ko-test-module');
testModule.controller('testController', function(env, TestList, ListView, ComposeView) {
    var testList = new TestList();
    testList.add(new testList.model({name: 'Test'}));

    var msgView = new ListView({collection: testList});
    var composeView = new ComposeView({collection: testList});

    env.testList = testList;
    env.$el.find(".ko-listview").html(msgView.render().el);
    env.$el.find(".ko-composeview").html(composeView.render().el);
})
.run(function(controller) {
    controller('testController');
});