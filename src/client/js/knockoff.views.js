(function(window, undefined) {

    if (window.knockoff === undefined) {
        throw new Error('Knockoff library is undefined!');
    }

    var knockoff = window.knockoff;

    var MixinConfigureProps = function(options, propList) {
        if (this.options) options = _.extend({}, _.result(this, 'options'), options);
        _.extend(this, _.pick(options, propList));
    };

    var View = function(options, inject) {
        this.injector = knockoff.injector;
        inject = inject || {};
        for (var depName in inject) {
            options[depName] = this.injector.getDep(inject[depName]);
        this.propList = options.propList || this.propList;
        }
        options = options || {};
        MixinConfigureProps.apply(this, [options, this.propList]);
        Backbone.View.apply(this, [options]);
    };
    _.extend(View.prototype, Backbone.View.prototype, {
        propList: []
    });
    View.extend = Backbone.View.extend;

    var ListItemView = View.extend({
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

    var ListView = View.extend({
        propList: ['itemView'],
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
        }
    });
    ListView.extend = View.extend;

    knockoff.ui = {
        View: View,
        List: ListView,
        ListItem: ListItemView
    };
})(window);