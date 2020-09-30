var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Countryschema = new Schema({
    _id:    {
               type: String
            },
    name:   {
                type: String
            },
            
    code:   {
                type: String
            },

    status: {
                type: Boolean,
                default:true
            }
}, {
    timestamps: true
});

Countryschema.plugin(mongoosePaginate);
Countryschema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('Country', Countryschema);