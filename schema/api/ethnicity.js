var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Ethnicityschema = new Schema({
    _id:    {
               type: String
            },

    name:   {
               type: String
            },

    status: {
                type: Boolean,
                default:true
            }
}, {
    timestamps: true
});

Ethnicityschema.plugin(mongoosePaginate);
Ethnicityschema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('Ethnicity', Ethnicityschema);