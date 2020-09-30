var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Schema = mongoose.Schema;
var userschema = new Schema({
            _id             : { type: String, required : true},
            fullName        : { type: String, default: '' },
            profileImage    : { type: String, default: '' },
            profile         : [{
                                    media: {
                                        type: String,
                                        default: ''
                                    },
                                    isMain: {
                                        type: Boolean,
                                        default: false
                                    }
                               }],
            selfieImage     : { type: String, default: '' },
            nickName        : { type: String, default: '' },
            statusMessage   : { type: String, default: '' },
            aboutYourself   : { type: String, default: '' },
            profession      : { type: String, default: '' },
            jobTitle        : { type: String, default: '' },
            employer        : { type: String, default: '' },
            ethnicGroup     : { type: String, default: '' },
            ethnicOrigin    : { type: String, default: '' },
            languages       : [{ type: String }],
            religiosity     : { type: String, default: '' },
            religion        : { type: String, default: 'Islam' },
            religionDress   : { type: String, default: '' },
            badges          : [{ type: String }],
            chewKhat        : { type: Boolean },
            smoker          : { type: Boolean },
            isChildren      : { type: Boolean },
            height          : { type: Number },
            maritalStatus   : { type: String, default: ''},
            education       : { type: String, default: ''},
            prayTime        : { type: String, default: ''},
            children        : { type: Number },
            hobbies         : { type: String, default: '' },
            marriageHorizon : { type: String, default: '' },
            moveAbroadStatus: { type: Boolean},
            gender          : { type: String },
            email           : { type: String, default: '' },
            phoneNumber     : { type: String, default: '' },
            location        : { type: String, default: '' },
            age             : { type: Number },
            country         : { type: String, default: '' },
            city            : { type: String, default: '' },
            dob             : { type: Date},
            email_verify    : { type: Boolean, default: false },
            isLike          : { type: Boolean, default: false },
            otp             : { type: String, default: '' },
            password        : { type: String, default: '' },
            authToken       : { type: String, default: '' },
            appType         : { type: String, enum: ['IOS', 'ANDROID', 'BROWSER']},
            socialLogin     : { type:Object },
            deviceToken     : { type: String, default: '' },
            deviceId        : { type: String, default: '' },
            status          : { type: Boolean, default: false },
            isProfileCreated: { type: Boolean, default: false },
            isBlurPhoto     : { type: Boolean, default: false },
            adminresponse   : { type: String, default: '' },
            geoLocation      : {
                                type: [Number],
                                index: '2d'
                              },                              
            career          : [{ type: String }],
            favouriteUserId : [{ type: String }],
            blockUserId     : [{ type: String }],
            reportUserId    : [{ type: String }],
            likeUserId      : [{ type: String }],
            dislikeUserId   : [{ type: String }],
            likeYouUserId   : [{ type: String }],
            visitedYouUserId: [{ type: String }],
            emailVerificationToken  : { type: String, default: '' }

    }, 
    {
     timestamps: true
    });
userschema.pre('save', function (next) {
    var user = this;
    if (!user.isModified('password'))
        return next();
    
    bcrypt.hash(user.password, null, null, function (err, hash) {
        if (err) {
            return next(err);
        }
        if(user.password !== ""){
            user.password = hash;
        }
        next();
    });
});

userschema.plugin(mongoosePaginate);
userschema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('User', userschema);