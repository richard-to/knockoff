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
var testModule = app.module('test', '.ko-test-module');
testModule.factory('testModel', TestModel)
.factory('testList', TestList)
.controller('testController', ['env', 'testList', function(env, testList) {
    env.testList = testList.add(new testList.model({name: 'Test'}));
    var view = new Knockoff.View.List({collection: env.testList});
    var composeView = new TestComposeView({});
    env.$el.find(".ko-listview").html(view.render().el);
    env.$el.find(".ko-composeview").html(composeView.render().el);
}])
.run(function(controller) {
    controller('testController');
});