var TestModel = Backbone.Model.extend({
    defaults: {
        'name': '',
        'msg': 'No message.'
    }
});

var TestList = Backbone.Collection.extend({
    model: TestModel
});

var TestViewList = Backbone.View.extend({
    tagName: 'ul',
    initialize: function() {
        _.bindAll(this, 'render', 'appendItem');
        this.collection.on('add', this.appendItem);
    },
    render: function() {
        var self = this;
        _(this.collection.models).each(function(item) {
            self.appendItem(item);
        }, this);
        return this;
    },
    appendItem: function(item) {
        var view = new TestViewItem({
            model: item
        });
        $(this.el).prepend(view.render().el);
    }
});

var TestViewItem = Backbone.View.extend({
    tagName: 'li',
    initialize: function() {
        _.bindAll(this, 'render');
    },
    render: function() {
        var emailP = $('<p/>').text(this.model.get('name'));
        var statusP = $('<p/>').text(this.model.get('message'));
        $(this.el).empty().append(emailP).append(statusP);
        return this;
    }
});

var knockoff = new Knockoff();
var app = knockoff.module('app');
app.factory('testModel', TestModel)
.factory('testList', TestList)
.controller('testController', function(testList) {
    testList.add(new testList.model({name: 'Test'}));
    var view = new TestViewList({collection: testList});
    $("#test").html(view.render().el);
})
.run(function(controller) {
    controller('testController');
});