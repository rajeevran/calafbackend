var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var BlockUserschema = new Schema({
    _id: { type: String},

    fromUser: {
               type: String,
               ref:'User'
              },

    title:  {
            type: String,   
            required: false,
            default: ''
            },

    message:{
            type: String, 
            required: false,
            default: ''
            },

    toUser: {
            type: String,
            ref:'User'
            }
}, {
    timestamps: true
});

BlockUserschema.plugin(mongoosePaginate);
BlockUserschema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('BlockUser', BlockUserschema);