(function(window, undefined) {

    if (window.knockoff === undefined) {
        throw new Error('Knockoff library is undefined!');
    }

    var knockoff = window.knockoff;

    var MixinConfigureProps = function(options, propList) {
        if (this.options) options = _.extend({}, _.result(this, 'options'), options);
        _.extend(this, _.pick(options, propList));
    };

    var ListItemView = Backbone.View.extend({
        tagName: 'li',
        template: _.template($("#ko-listitemview-tmpl").html()),
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            this.$el.html(this.template(this.model.attributes));
            return this;
        }
    });

    var ListView = function(options) {
        var propList = ['itemView'];
        options = options || {};
        this._configureProps(options || {}, propList);
        Backbone.View.apply(this, [options]);
    };

    _.extend(ListView.prototype, Backbone.View.prototype, {
        tagName: 'ul',
        itemView: ListItemView,
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
            var view = new this.itemView({
                model: item
            });
            this.$el.append(view.render().el);
        },
        _configureProps: MixinConfigureProps
    });
    ListView.extend = Backbone.View.extend;

    knockoff.view = {
        List: ListView,
        ListItem: ListItemView
    };
})(window);