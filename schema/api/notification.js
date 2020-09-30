var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Notoficationschema = new Schema({
    _id: { type: String},

    fromUser: {
               type: String,
               ref:'User'
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

module.exports = mongoose.model('Notification', Notoficationschema);