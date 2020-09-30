
var UserSchema = require('../../schema/api/users');
var TermsSchema = require('../../schema/api/terms');
var PrivacySchema = require('../../schema/api/privacy');
var BlockUserSchema = require('../../schema/api/blockuser');
var CountrySchema = require('../../schema/api/country');
var EthnicitySchema = require('../../schema/api/ethnicity');
var FeedBackSchema = require('../../schema/api/feedback');
var config = require('../../config');
var async = require("async");
var bcrypt = require('bcrypt-nodejs');
var mailProperty = require('../../modules/sendMail');
var fcmNotification = require('../../modules/fcmNotification');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var https = require('https');
var request = require('request');
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var secretKey = config.secretKey;
//BlockUser
//create auth token
createToken = (admin) => {
    var tokenData = {
        id: admin._id
    };
    var token = jwt.sign(tokenData, secretKey, { 
        expiresIn: '30d'
    });
    return token;
};

randomString = (len, charSet) => {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
      var randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
  };

const download = (url, dest) => {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    var err = new Error('File couldn\'t be retrieved');
                    err.status = res.statusCode;
                    return reject(err);
                }
                var chunks = [];
                res.setEncoding('binary');
                res.on('data', (chunk) => {
                    chunks += chunk;
                }).on('end', () => {
                    var stream = fs.createWriteStream(dest);
                    stream.write(chunks, 'binary');
                    stream.on('finish', () => {
                        resolve('File Saved !');
                    });
                    res.pipe(stream);
                })
            }).on('error', (e) => {
                console.log("Error: " + e);
                reject(e.message);
            });
        })
    };


    // request.head(url, (err, res, body) => {
    //   request(url)
    //     .pipe(fs.createWriteStream(path))
    //     .on('close', callback)
    // })
  //}
  

var apiModel = {

    authenticate: function (jwtData, callback) {
        if (jwtData["x-access-token"]) {
            jwt.verify(jwtData["x-access-token"], config.secretKey, function (err, decoded) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 420,
                        message: "Session timeout! Please login again.",
                        response: err
                    });
                } else {
                    callback({
                        success: true,
                        STATUSCODE: 200,
                        message: "Authenticate successfully.",
                        response: decoded
                    });
                }
            });
        }
    },

    //register employee
    register: function (data, callback) {

    	console.log('daata---->', data)
        if (data) {
            UserSchema.findOne({
                    email: data.email
                }, {
                    _id: 1,
                    email: 1,
                },
                function (err, result) {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "INTERNAL DB ERROR",
                            response: []
                        });
                    } else {
                        if (result !== null) {
                            callback({
                                success: false,
                                STATUSCODE: 404,
                                message: "Email address already exist",
                                response: result
                            });
                        } else {

                            new UserSchema(data).save(async function (err, result) {
                                if (err) {
                                    callback({
                                        success: false,
                                        STATUSCODE: 505,
                                        message: "INTERNAL DB ERROR",
                                        response: []
                                    });
                                } else {

                                    let otp = Math.random().toString().replace('0.', '').substr(0, 4);

                                    await UserSchema.update({_id:result._id},
                                        {
                                            $set:{
                                                otp : otp

                                            }
                                        })

                                    mailProperty('emailVerificationMail')(data.email, {
                                        name: data.fullName,
                                        email: data.email,
                                        verification_code: otp,
                                        site_url: config.liveUrl,
                                        date: new Date()
                                    }).send();

                                    callback({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: "Registered Successfully.",
                                        response: "Please Check Your Registered Email For OTP Verification."
                                    });
                                }
                            });
                        }
                    }
                });
        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: []
            });
        }
    },

    //Social Login
    socialRegister: (data, callback) => {


        console.log('data.socialLogin---',(data.socialLogin));
        
        UserSchema.findOne({
           ...(data.socialLogin ? { "socialLogin.socialId": (data.socialLogin).socialId } : {})
        }, async (err, user) => {
            if (err) {
                console.log("Error1", err);
                callback({
                    success: false,
                    STATUSCODE: 505,
                    message: "Internal Server Error!",
                    response: {}
                });
            } else {
                if (user) 
                {
                    let token = createToken(user);
                    user.authToken      = token;
                    user.socialLogin    = data.socialLogin;
                    //data.profileImage   = data.socialLogin.image
                    user.deviceId       = data.deviceId

                    user.save();
                    console.log('data.socialLogin--->',user)
                
                    callback({
                        success: true,
                        STATUSCODE: 200,
                        message: "User Details ",
                        response: user
                        
                    })

                } else {
                    data._id = new ObjectID;
                    let token = createToken(data);
                    let deviceId = data.deviceId

                    if (token) {

                        const url = data.socialLogin.image
                        const path = `${config.UploadUserProfilePath}${data.socialLogin.socialId}.png`
                        const UserProfilePath = `${config.UserProfilePath}${data.socialLogin.socialId}.png`
                        const profilePic = [(
                            {
                                media: UserProfilePath,
                                isMain: true
                           }
                        )]
                        console.log('profilePic-----',profilePic)

                        await download(url, path)

                        data = {
                            _id            : new ObjectID,
                            socialLogin    : data.socialLogin,
                            profileImage   : UserProfilePath,
                            deviceId       : data.deviceId,
                            fullName       : data.fullName,
                            email          : data.email,
                            phoneNumber    : data.phoneNumber,
                            profile        : profilePic
                        }

                        console.log('data social register--->',data)

                        new UserSchema(data).save(function (err, result) {
                            if (err) {
                                console.log("Error2", err);
                                callback({
                                    success: false,
                                    STATUSCODE: 404,
                                    message: "Internal Server Error!",
                                    response: err
                                });
                            } else {
                              
                                var all_result = {

                                    authToken   : token,
                                    deviceId    : deviceId,
                                    _id         : result._id,
                                    fullName    : result.fullName,
                                    email       : result.email,
                                    phoneNumber : data.phoneNumber,
                                    profileImage: UserProfilePath,
                                    profile     : profilePic,
                                    socialLogin : result.socialLogin

                                }
                                    callback({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: "User Successfully Logged in.",
                                        response: all_result
                                    
                                });
                            }
                        });
                    }
                }
            }
        })
    },

    //verifyEmailOtp
    verifyEmailOtp: function (data, callback) {
        if (data) {

            UserSchema.findOne({
                'email': data.email.toLowerCase(),
                'otp': data.otp
                },
                async function (err, resDetails) {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "something went wrong!",
                            response: err
                        });
                    } else {
                        if (resDetails === null) {
                            callback({
                                success: false,
                                STATUSCODE: 404,
                                message: "Otp Verification Failed!",
                                response: {}
                            });
                        } else {

                            UserSchema.update({
                                'email': data.email.toLowerCase(),
                                    }, {
                                        $set: {
                                            'email_verify': true
                                        }
                                    }, async (err, resUpdate) => {
                                        if (err) {
                                            callback({
                                                success: false,
                                                STATUSCODE: 505,
                                                message: "INTERNAL DB ERROR",
                                                response: err
                                            });
                                        }
                                    }) 

                                   let userdata = await UserSchema.findOne({
                                        'email': data.email.toLowerCase()
                                    })
                                    
                                    callback({
                                        success: true,
                                        STATUSCODE: 200,
                                        message: "Otp Verify successfully",
                                        response: userdata
                                    });
                                }                                               
                    }
                });
        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "Internal Server Error!",
                response: {}
            });
        }
    },
    
    //login
    login: async function (data, callback) {

        let email = data.email
        let phoneNumber = data.phoneNumber
        let query = {}
        if(data.email)
        {
            query["email"] = email
        }

        if(data.phoneNumber)
        {
            query["phoneNumber"] = phoneNumber
        }

        if ( (data.email || data.phoneNumber) ) {

           UserSchema.findOne(query, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "INTERNAL DB ERROR",
                        response: []
                    });

                } else {
                    if (result === null) {

                        callback({
                            success: false,
                            STATUSCODE: 404,
                            message: "Wrong password or email. Please provide registered details.",
                            response: []
                        });


                    } else {

                        if (result.email_verify === false) {
                            var all_result = {
                                authtoken: '',
                                _id: result._id,
                                fullName: result.fullName ,
                                email: result.email
                            }
                            callback({
                                success: false,
                                STATUSCODE: 404,
                                message: "Your account is not activated. Please activate your account from your register email.",
                                response: all_result
                            });
                        } else {

                            bcrypt.compare(data.password.toString(), result.password, function (err, response) {
                                // result == true
                                if (response == true) {

                                    var token = createToken(result);
                                    UserSchema.update({
                                        _id: result._id
                                    }, {
                                        $set: {
                                            deviceToken: data.deviceToken,
                                            appType: data.appType
                                        }
                                    }, function (err, resUpdate) {
                                        if (err) {
                                            callback({
                                                success: false,
                                                STATUSCODE: 505,
                                                message: "INTERNAL DB ERROR",
                                                response: []
                                            });
                                        } else {

                                            let profile_image = result.profileImage;

                                            if (!profile_image || profile_image == '') {
                                                profile_image =  config.userDemoPicPath;
                                            } else {
                                                profile_image =  result.profileImage;
                                            }
                                            var all_result = {
                                                authtoken: token,
                                                _id: result._id,
                                                fullName: result.fullName,
                                                email: result.email,
                                                gender: result.gender,
                                                phoneNumber: result.phoneNumber,
                                                profileImage: profile_image
                                            }
                                            callback({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: "Logged your account",
                                                response: all_result
                                            });
                                        }
                                    });
                                } else {
                                    callback({
                                        
                                        success: false,
                                        STATUSCODE: 404,
                                        message: "Wrong password or email. Please provide registered details.",
                                        response: []
                                    });
                                }
                            });
                        }


                    }
                }
            })
        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    },

    // forget password
    forgotPassword: function (data, callback) {
        console.log('data----',data)
        if (data.email) {
            UserSchema.findOne({
                email: data.email
            }, async function (err, resDetails) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "INTERNAL DB ERROR",
                        response: err
                    });
                } else {
                    if (resDetails == null) {
                        callback({
                            success: false,
                            STATUSCODE: 5002,
                            message: "User does not exist",
                            response: {}
                        });
                    } else {

                        let emailVerificationToken = randomString(48)

                        mailProperty('forgotPasswordMail')(data.email, {
                                    name                    : `${resDetails.fullName}`,
                                    email                   : resDetails.email,
                                    reset_password_link     : config.liveUrl+'resetPassword/'+emailVerificationToken,
                                    site_url                : config.liveUrl,
                                    date                    : new Date()
                        }).send();

                        await UserSchema.update({email: data.email}, 
                            {
                                $set:{
                                    emailVerificationToken:emailVerificationToken
                                }
                            })

                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Mail Sent Successfully for Resetting Password.",
                            response: "Mail Sent Successfully.Please Check Your Registered Email To Reset Password."
                        });
                    }
                }
            });
        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "User email id not provided",
                response: {}
            });
        }
    },

    // reset password
    resetPassword: function (data, callback) {
        console.log('data----',data)

        if (data.resetPasswordToken) {
            UserSchema.findOne({
                emailVerificationToken: data.resetPasswordToken
            }, function (err, resDetails) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "INTERNAL DB ERROR",
                        response: err
                    });
                } else {
                    if (resDetails == null) {
                        callback({
                            success: false,
                            STATUSCODE: 5002,
                            message: "Your email verification Token Expired",
                            response: {}
                        });
                    } else {
                        bcrypt.hash(data.newPassword, null, null, function (err, hash) {
                            if (err) {
                                callback({
                                    success: false,
                                    STATUSCODE: 505,
                                    message: "INTERNAL DB ERROR",
                                    response: err
                                });
                            } else {
                                UserSchema.update({
                                    _id: resDetails._id
                                }, {
                                    $set: {
                                        "password": hash,
                                        emailVerificationToken:''
                                    }
                                }, function (err, result) {
                                    if (err) {
                                        callback({
                                            success: false,
                                            STATUSCODE: 505,
                                            message: "INTERNAL DB ERROR",
                                            response: err
                                        });
                                    } else {
                            
                                        mailProperty('resetPasswordMail')(resDetails.email, {
                                            name: resDetails.fullName,
                                            email: resDetails.email,
                                            reset_password: data.newPassword,
                                            site_url: config.liveUrl,
                                            date: new Date()
                                        }).send();

                                        callback({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: "Password changed Successfully.Please check your registered email.",
                                            response: { _id: resDetails._id, password:data.newPassword }
                                        });
                                    }
                                });
                            }
                        });

                    }
                }
            });
        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "Your email verification Token Expired",
                response: {}
            });
        }
    },

    reportedUserList: async function (data, callback) {
        // console.log('data----',data)
 
         var page = 1,
         limit = 10,
         query = {},
         queryName = {};
 
         if (data.page) {
             page = parseInt(data.page);
         }
 
         if (data.limit) {
             limit = parseInt(data.limit);
         }
 
         if(data.reportId){
             query['_id'] = data.reportId
         }  
   
         if(data.fromUser){
             query['fromUser'] = data.fromUser
         } 
 
         if(data.toUser){
            query['toUser'] = data.toUser
        } 
 
        if(data.message){
            query['message'] = new RegExp(data.message, 'i')
        } 

        if(data.title){
            query['title'] = new RegExp(data.title, 'i')
        } 

         var aggregate = BlockUserSchema.aggregate(
             {
                 $match: query
             },
             
             { 
                 $lookup : {
                     from : 'users',
                     localField : 'fromUser',
                     foreignField : '_id',
                     as : 'fromUser'
                 }
             },
             {
                 $unwind : { path : '$fromUser', preserveNullAndEmptyArrays : true } 
             },
             {
                 $lookup : {
                     from : 'users',
                     localField : 'toUser',
                     foreignField : '_id',
                     as : 'toUser'
                 }
             },
             {
                 $unwind : { path : '$toUser', preserveNullAndEmptyArrays : true } 
             },
         
             {
                 $group : {
                    "message" : "",
                    "title" : "",
                     _id :"$_id",
                     toUser : {
                         "$first": "$toUser"
                     },
                     fromUser : {
                         "$first": "$fromUser"
                     },
                     message : {
                         "$first": "$message"
                     },
                     title : {
                         "$first": "$title"
                     },
                     updatedAt : {
                         "$first": "$updatedAt"
                     }
                 }
             },
             {
                 $project : {
                     _id : 1,
                     fromUser: 1,
                     toUser: 1,
                     message: 1,
                     title:1,
                     updatedAt:1
                 }
             }, 
             {
                 $sort: {updatedAt: -1}
             }
 
         );
 
         var options = {
             page: page,
             limit: limit
         }
 
         BlockUserSchema.aggregatePaginate(aggregate, options, function (err, results, pageCount, count) {
             if (err) {
                 callback({
                     success: false,
                     STATUSCODE: 505,
                     message: err,
                     response: {}
                 });
 
             } else {
 
 
                 var data = {
                     docs:results,
                     pages: pageCount,
                     total: count,
                     limit: limit,
                     page: page
                 }
                 callback({
                     success: true,
                     STATUSCODE: 200,
                     message: "Reported User List",
                     response: data
                 });
 
             }
         });
     },
    // List User
    listUser: async function (data, callback) {
       // console.log('data----',data)

        var page = 1,
        limit = 10,
        query = {},
        queryName = {};

        if (data.page) {
            page = parseInt(data.page);
        }

        if (data.limit) {
            limit = parseInt(data.limit);
        }

        if(data.userId){
            query['_id'] = data.userId
        }           

        if(data.fullName){
            query['fullName'] = new RegExp(data.fullName, 'i')
        }   
        let queryWithoutChildren = ''
        console.log('data.isWithoutChildren---',data.isWithoutChildren)
        if(
            data.isWithoutChildren == 'false' || 
            data.isWithoutChildren == 'true' || 
            data.isWithoutChildren === false || 
            data.isWithoutChildren === true 
            ){
        
            if(data.isWithoutChildren == 'false' ){

                
                queryWithoutChildren = { children: {$gt : 0 } }

            }else{
    
                queryWithoutChildren = { children: {$eq : 0 } }

            }
        } 
        
        if(data.profession){
            query['profession'] = new RegExp(data.profession, 'i')
        } 

        if(data.height){
            query['height'] = data.height
        } 

        if(data.religiosity){
            query['religiosity'] = new RegExp(data.religiosity, 'i')
        } 

        if(data.religionDress){
            query['religionDress'] = new RegExp(data.religionDress, 'i')
        } 
        
        if(data.prayTime){
            query['prayTime'] = new RegExp(data.prayTime, 'i')
        } 
        
        if(data.education){
            query['education'] =new RegExp(data.education, 'i')
        } 
        
        if(data.marriageHorizon){
            query['marriageHorizon'] =new RegExp(data.marriageHorizon, 'i')
        } 
        
        let queryEthnicity = ''

        if(data.ethnicity)
        {
            queryEthnicity = { 
                                $or : 
                                        [
                                            {ethnicGroup  : { $in: JSON.parse(data.ethnicity) } },
                                            {ethnicOrigin : { $in: JSON.parse(data.ethnicity) } }
                                        ]
                             }
        } 

//        
        
        let querygeoLocation = ''
        let aggragatequerygeoLocation = {}

        if(data.geoLocation && data.distance)
        {

            querygeoLocation = { 
                                "geoLocation": {
                                    $geoWithin: {
                                    $centerSphere: [
                                        JSON.parse(data.geoLocation), (parseInt(data.distance))/6371        //check the user point is present here
                                    ]
                                    }
                                }
                            
                            }

        } 

        let queryLocationCountry = ''

        if(data.country)
        {
            queryLocationCountry = {
                                        country  : { $in: JSON.parse(data.country) }
                                    }
        } 

        if(data.education){
            query['education'] = new RegExp(data.education, 'i')
        }  

        if(data.maritalStatus){
            query['maritalStatus'] = new RegExp(data.maritalStatus, 'i')
        }  
        
        if(data.phoneNumber){
            query['phoneNumber'] = data.phoneNumber
        } 

        if(data.email){
            query['email'] = data.email
        } 

        if(data.gender){
            query['gender'] = data.gender
        } 

        if(data.city){
            query['city'] = new RegExp(data.city, 'i')
        } 
        
        if(data.country){
            query['country'] =new RegExp(data.country, 'i')
        } 
        
        if(data.location){
            query['location'] = new RegExp(data.location, 'i')
        } 

        let queryAge = ''

        if(data.startAge && data.endAge){
            queryAge =     {
                            age: {
                                            $gte: parseInt(data.startAge),
                                            $lt:  parseInt(data.endAge)
                                }
                            }

            //query['age'] = parseInt(data.age)
        }        

        if(data.isLike === false || data.isLike === 'false' ){
            query['isLike'] = false
        }         

        if(data.isLike === true || data.isLike === 'true'){
            query['isLike'] = true
        }   


        if(data.status === false || data.status === 'false' ){
            query['status'] = false
        }         
        if(data.status === true || data.status === 'true'){
            query['status'] = true
        }   

        
        if(data.isBlurPhoto === false || data.isBlurPhoto === 'false' ){
            query['isBlurPhoto'] = false
        }         
        if(data.isBlurPhoto === true || data.isBlurPhoto === 'true'){
            query['isBlurPhoto'] = true
        }   


        if(data.dob){
            query['dob'] = new Date(data.dob)
        } 
        let queryLikeDislike = ''
        if(data.excludedUserId)
        {
            //query['_id'] = { $ne :data.excludedUserId }

            var matchedUser = await UserSchema.findOne({_id:data.excludedUserId});
            console.log('matchedUser---',matchedUser)
            if(matchedUser !== null)
            {

                queryLikeDislike = { 
                                        $or : 
                                                [
                                                    { 
                                                        _id: { 
                                                            $nin : [...matchedUser.likeUserId , ...matchedUser.dislikeUserId, data.excludedUserId]
                                                           } 
                                                     },
                                                    { _id     : data.userId }
                                                ]
                                   
                                   }

            }

        } 
        if(data.career){
            query['career'] = { $in : JSON.parse(data.career) }
        } 

        if(data.favouriteUserId){
            query['favouriteUserId'] = { $in : JSON.parse(data.favouriteUserId) }
        } 

        if(data.blockUserId){
            query['blockUserId'] = { $in :JSON.parse(data.blockUserId) }
        } 

        if(data.reportUserId){
            query['reportUserId'] = { $in : JSON.parse(data.reportUserId) }
        } 

        if(data.likeUserId){
            query['likeUserId'] = { $in : JSON.parse(data.likeUserId) } 
        } 
        if(data.dislikeUserId){
            query['dislikeUserId'] = { $in : JSON.parse(data.dislikeUserId) } 
        } 

        if (data.searchName) {
            query['fullName'] = new RegExp(data.searchName, 'i')
        }

        query = (queryLikeDislike != '')     ? { ...query ,...queryLikeDislike}     : query
        query = (queryWithoutChildren != '') ? { ...query ,...queryWithoutChildren} : query
        query = (queryEthnicity != '')       ? { ...query ,...queryEthnicity}       : query
        query = (queryLocationCountry != '') ? { ...query ,...queryLocationCountry} : query
        query = (querygeoLocation != '')     ? { ...query ,...querygeoLocation}     : query
        query = (queryAge != '')             ? { ...query ,...queryAge}             : query
        

        var aggregate = UserSchema.aggregate(
            {
                $match: query
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'favouriteUserId',
                    foreignField : '_id',
                    as : 'favouriteUserId'
                }
            },
            {
                $unwind : { path : '$favouriteUserId', preserveNullAndEmptyArrays : true } 
            }, 

            {
                $lookup : {
                    from : 'users',
                    localField : 'blockUserId',
                    foreignField : '_id',
                    as : 'blockUserId'
                }
            },
            {
                $unwind : { path : '$blockUserId', preserveNullAndEmptyArrays : true } 
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'reportUserId',
                    foreignField : '_id',
                    as : 'reportUserId'
                }
            },
            {
                $unwind : { path : '$reportUserId', preserveNullAndEmptyArrays : true } 
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'likeUserId',
                    foreignField : '_id',
                    as : 'likeUserId'
                }
            },
            {
                $unwind : { path : '$likeUserId', preserveNullAndEmptyArrays : true } 
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'dislikeUserId',
                    foreignField : '_id',
                    as : 'dislikeUserId'
                }
            },
            {
                $unwind : { path : '$dislikeUserId', preserveNullAndEmptyArrays : true } 
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'likeYouUserId',
                    foreignField : '_id',
                    as : 'likeYouUserId'
                }
            },
            {
                $unwind : { path : '$likeYouUserId', preserveNullAndEmptyArrays : true } 
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'visitedYouUserId',
                    foreignField : '_id',
                    as : 'visitedYouUserId'
                }
            },
            {
                $unwind : { path : '$visitedYouUserId', preserveNullAndEmptyArrays : true } 
            },
        
            {
                $group : {
    
                    _id :"$_id",
                    fullName : {
                        "$first": "$fullName"
                    },
                    phoneNumber : {
                        "$first": "$phoneNumber"
                    },
                    profile : {
                        "$first": "$profile"
                    },
                    profileImage : {
                        "$first": "$profileImage"
                    },
                    selfieImage : {
                        "$first": "$selfieImage"
                    },
                    nickName : {
                        "$first": "$nickName"
                    },
                    statusMessage : {
                        "$first": "$statusMessage"
                    },
                    aboutYourself : {
                        "$first": "$aboutYourself"
                    },
                    profession : {
                        "$first": "$profession"
                    },
                    jobTitle : {
                        "$first": "$jobTitle"
                    },
                    employer : {
                        "$first": "$employer"
                    },
                    ethnicGroup : {
                        "$first": "$ethnicGroup"
                    },
                    ethnicOrigin : {
                        "$first": "$ethnicOrigin"
                    },
                    languages : {
                        "$first": "$languages"
                    },
                    religiosity : {
                        "$first": "$religiosity"
                    },
                    religion : {
                        "$first": "$religion"
                    },
                    religionDress : {
                        "$first": "$religionDress"
                    },
                    badges : {
                        "$first": "$badges"
                    },
                    
                    chewKhat : {
                        "$first": "$chewKhat"
                    },
                    smoker : {
                        "$first": "$smoker"
                    },
                    isChildren : {
                        "$first": "$isChildren"
                    },
                    height : {
                        "$first": "$height"
                    },
                    maritalStatus : {
                        "$first": "$maritalStatus"
                    },
                    education : {
                        "$first": "$education"
                    },
                    prayTime : {
                        "$first": "$prayTime"
                    },
                    children : {
                        "$first": "$children"
                    },
                    hobbies : {
                        "$first": "$hobbies"
                    },
                    marriageHorizon : {
                        "$first": "$marriageHorizon"
                    },
                    moveAbroadStatus : {
                        "$first": "$moveAbroadStatus"
                    },
                    gender : {
                        "$first": "$gender"
                    },
                    email : {
                        "$first": "$email"
                    },
                    phoneNumber : {
                        "$first": "$phoneNumber"
                    },
                    location : {
                        "$first": "$location"
                    },
                    age : {
                        "$first": "$age"
                    },
                    
                    country : {
                        "$first": "$country"
                    },
                    city : {
                        "$first": "$city"
                    },
                    dob : {
                        "$first": "$dob"
                    },
                    email_verify : {
                        "$first": "$email_verify"
                    },
                    isLike : {
                        "$first": "$isLike"
                    },
                    otp : {
                        "$first": "$otp"
                    },
                    password : {
                        "$first": "$password"
                    },
                    authToken : {
                        "$first": "$authToken"
                    },
                    appType : {
                        "$first": "$appType"
                    },
                    socialLogin : {
                        "$first": "$socialLogin"
                    },
                    deviceToken : {
                        "$first": "$deviceToken"
                    },
                    deviceId : {
                        "$first": "$deviceId"
                    },
                    status : {
                        "$first": "$status"
                    },
                    career : {
                        "$first": "$career"
                    },
                    isProfileCreated : {
                        "$first": "$isProfileCreated"
                    },
                    
                    favouriteUserId : {
                        "$addToSet": "$favouriteUserId"
                    },
                    blockUserId : {
                        "$addToSet": "$blockUserId"
                    },
                    reportUserId : {
                        "$addToSet": "$reportUserId"
                    },
                    likeUserId : {
                        "$addToSet": "$likeUserId"
                    },
                    dislikeUserId : {
                        "$addToSet": "$dislikeUserId"
                    },
                    likeYouUserId : {
                        "$addToSet": "$likeYouUserId"
                    },
                    visitedYouUserId : {
                        "$addToSet": "$visitedYouUserId"
                    },
                    updatedAt : {
                        "$first": "$updatedAt"
                    },
                }
            },
            {
                $project : {
                    _id : 1,
                    fullName: 1,
                    profileImage: 1,
                    phoneNumber: 1,
                    profile: 1,
                    selfieImage: 1,
                    nickName: 1,
                    statusMessage: 1,
                    aboutYourself:1,
                    profession: 1,
                    jobTitle: 1,
                    employer: 1,
                    ethnicGroup: 1,
                    ethnicOrigin: 1,
                    languages: 1,
                    religiosity: 1,
                    religion: 1,
                    religionDress: 1,
                    badges: 1,
                    chewKhat : 1,
                    smoker : 1,
                    isChildren : 1,
                    height : 1,
                    maritalStatus : 1,
                    education : 1,
                    prayTime : 1,
                    children : 1,
                    hobbies : 1,
                    marriageHorizon : 1,
                    moveAbroadStatus : 1,
                    gender : 1,
                    email : 1,
                    phoneNumber : 1,
                    location : 1,
                    age : 1,
                    country : 1,
                    city : 1,
                    dob : 1,
                    email_verify : 1,
                    isLike : 1,
                    otp : 1,
                    password : 1,
                    authToken : 1,
                    appType : 1,
                    socialLogin : 1,
                    deviceToken : 1,
                    deviceId : 1,
                    status : 1,
                    career : 1,
                    isProfileCreated:1,
                    favouriteUserId : 1,
                    blockUserId : 1,
                    reportUserId : 1,
                    likeUserId : 1,
                    dislikeUserId : 1,
                    likeYouUserId :1,
                    updatedAt:1,
                    visitedYouUserId : 1
                }
            }, 
            {
                $sort: {updatedAt: -1}
            }

        );
        // aggregate.match(query);
        // aggregate.sort({
        //     'updatedAt': -1
        // })

        var options = {
            page: page,
            limit: limit
        }

        UserSchema.aggregatePaginate(aggregate, options, function (err, results, pageCount, count) {
            if (err) {
                callback({
                    success: false,
                    STATUSCODE: 505,
                    message: err,
                    response: {}
                });

            } else {

                
                results.map( (result) => {

                    let profile_image = result.profileImage;
                    //let selfie_image = result.selfieImage;

                    if (!profile_image || profile_image == '') {
                        profile_image = config.userDemoPicPath;
                    } else {
                        profile_image = result.profileImage;
                    }


                    result.profileImage = profile_image

                } )


                var data = {
                    docs:results,
                    pages: pageCount,
                    total: count,
                    limit: limit,
                    page: page
                }
                callback({
                    success: true,
                    STATUSCODE: 200,
                    message: "User List",
                    response: data
                });

            }
        });
    },

    // Edit User Information
    editUser: async function (data, fileData, callback) {
        if (data) {
            console.log('data------->',data)
            let user = await UserSchema.findOne({
                _id: data.userId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while editing user",
                        response: err
                    });
                }
            });

            if (user !== null) {

                let definedfavouriteUserId  = user.favouriteUserId ? user.favouriteUserId : []
                let definedlanguages        = user.languages ? user.languages : []
                let definedbadges           = user.badges ? user.badges : []
                let definedblockUserId      = user.blockUserId ? user.blockUserId : []
                let definedreportUserId     = user.reportUserId ? user.reportUserId : []
                let definedlikeUserId       = user.likeUserId ? user.likeUserId : []
                let defineddislikeUserId    = user.dislikeUserId ? user.dislikeUserId : []
                
                if(data.favouriteUserId != '' && data.favouriteUserId && !user.favouriteUserId.includes(data.favouriteUserId))
                {
                    definedfavouriteUserId.push(data.favouriteUserId)
                }
                
                if(data.languages)
                {
                    definedlanguages = JSON.parse(data.languages)
                }

                if(data.badges)
                {
                    definedbadges = JSON.parse(data.badges)
                }
                
                
                if(data.blockUserId != '' && data.blockUserId && !user.blockUserId.includes(data.blockUserId))
                {
                    definedblockUserId.push(data.blockUserId)
                }
                if(data.reportUserId != '' && data.reportUserId && !user.reportUserId.includes(data.reportUserId))
                {
                    await BlockUserSchema.create({
                        _id      : new ObjectID,
                        fromUser : data.userId,
                        toUser   : data.reportUserId,
                        message  : data.message,
                        title    : data.title
                    })

                    definedreportUserId.push(data.reportUserId)

                }
                if(data.likeUserId != '' && data.likeUserId && !user.likeUserId.includes(data.likeUserId))
                {
                    // -----------------------this is for like you start...................

                    let likeYouUser = await UserSchema.findOne({
                        _id: data.likeUserId
                    })

                    if(likeYouUser !== null)
                    {
                        let likeYouUserId = likeYouUser.likeYouUserId ? likeYouUser.likeYouUserId : []

                        if(!likeYouUserId.includes(data.userId))
                        {
                            likeYouUserId.push(data.userId)

                            await UserSchema.update({
                                _id: data.likeUserId
                            },
                            {
                            $set : {
                                likeYouUserId:likeYouUserId
                            }
                            })
                        }
                    }
                    // -----------------------this is for like you end...................

                    definedlikeUserId.push(data.likeUserId)
                }

                if(data.visitedYouUserId != '' && data.visitedYouUserId && !user.visitedYouUserId.includes(data.visitedYouUserId))
                {

                   // -----------------------this is for visited you start...................

                    let visitedYouUser = await UserSchema.findOne({
                        _id: data.visitedYouUserId
                    })
                    console.log('visitedYouUser---',visitedYouUser)
                    if(visitedYouUser !== null)
                    {
                        let visitedYouUserId = visitedYouUser.visitedYouUserId ? visitedYouUser.visitedYouUserId : []

                        if(!visitedYouUserId.includes(data.userId))
                        {
                            visitedYouUserId.push(data.userId)

                            await UserSchema.update({
                                _id: data.visitedYouUserId
                            },
                            {
                            $set : {
                                visitedYouUserId:visitedYouUserId
                            }
                            })
                        }
                    }
                    // -----------------------this is for visited you end...................
                 
                }

                if(data.dislikeUserId != '' && data.dislikeUserId && !user.dislikeUserId.includes(data.dislikeUserId))
                {
                    defineddislikeUserId.push(data.dislikeUserId)

                }
				console.log('data.age---->', typeof data.age)

                // let vv= {  ...((data.age != undefined)? { age : data.age } : {} ) }
                // console.log('vv---->', vv)

                UserSchema.update({
                    _id: data.userId
                }, {
                    $set: {
                        ...(( data.geoLocaion)   ? { geoLocaion : JSON.parse(data.geoLocaion) }   : {}),
                        ...(( data.fullName)     ? { fullName : data.fullName }             : {}),
                        ...(( data.gender)       ? { gender : data.gender }                 : {}),
                        ...(( data.phoneNumber)  ? { phoneNumber : data.phoneNumber }       : {}),
                        ...(( data.email)        ? { email : data.email }                   : {}),
                        ...(( data.dob !== undefined && data.dob !== 'undefined' && data.dob !== 'null')          ? { dob : data.dob }                 : {}),
                        ...(( data.age !== undefined && data.age !== 'undefined' && data.age !== 'null')          ? { age : data.age }                 : {}),
                        ...(( data.location)     ? { location : data.location }             : {}),
                        ...(( data.education)    ? { education : data.education }           : {}),
                        ...(( data.prayTime)     ? { prayTime : data.prayTime }             : {}),
                        ...(( data.country)      ? { country : data.country }               : {}),
                        ...(( data.city)         ? { city : data.city }                     : {}),
                        ...(( data.status)       ? { status : data.status }                 : {}),
                        ...(( data.isLike )      ? { isLike : data.isLike }                 : {}),
                        ...(( data.isBlurPhoto ) ? { isBlurPhoto : data.isBlurPhoto }       : {}),
                        ...(( data.isProfileCreated ) ? { isProfileCreated : data.isProfileCreated }                 : {}),
                        ...(( data.nickName)     ? { nickName : data.nickName }             : {}),
                        ...(( data.statusMessage)? { statusMessage : data.statusMessage }   : {}),
                        ...(( data.aboutYourself)? { aboutYourself : data.aboutYourself }   : {}),
                        ...(( data.profession)   ? { profession : data.profession }         : {}),
                        ...(( data.jobTitle)     ? { jobTitle : data.jobTitle }             : {}),
                        ...(( data.employer)     ? { employer : data.employer }             : {}),
                        ...(( data.ethnicGroup)  ? { ethnicGroup : data.ethnicGroup }       : {}),
                        ...(( data.ethnicOrigin) ? { ethnicOrigin : data.ethnicOrigin }     : {}),
                        ...(( data.religiosity)  ? { religiosity : data.religiosity }       : {}),
                        ...(( data.chewKhat)     ? { chewKhat : data.chewKhat }             : {}),
                        ...(( data.smoker)       ? { smoker : data.smoker }                 : {}),
                        ...(( data.height !== undefined && data.height !== 'undefined' && data.height !== 'null')       ? { height : data.height }                 : {}),
                        ...(( data.maritalStatus)   ? { maritalStatus : data.maritalStatus }   : {}),
                        ...(( data.isChildren)      ? { isChildren    : data.isChildren    }         : {}),
                        ...(( data.children !== undefined && data.children !== 'undefined' && data.children !== 'null')     ? { children : data.children }             : {}),
                        ...(( data.hobbies)         ? { hobbies : data.hobbies }               : {}),
                        ...(( data.marriageHorizon) ? { marriageHorizon : data.marriageHorizon } : {}),
                        ...(( data.moveAbroadStatus)?{ moveAbroadStatus : data.moveAbroadStatus } : {}),
                        ...(( data.religion)        ? { religion : data.religion } : {}),
                        ...(( data.religionDress)   ? { religionDress : data.religionDress } : {}),
                            favouriteUserId         : definedfavouriteUserId,
                            badges                  : definedbadges,
                            languages               : definedlanguages,
                            blockUserId             : definedblockUserId,
                            reportUserId            : definedreportUserId,
                            likeUserId              : definedlikeUserId,
                            dislikeUserId           : defineddislikeUserId
                    }
                }, async (err, resUpdate) => {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: err.message,
                            response: err
                        });
                    } else {

                        console.log('fileData-------->',fileData);
                        
                        if( fileData && fileData !== null){

                            //profileImage

                            if(fileData.profileImage)
                            {

                                if (user.profileImage !== undefined && user.profileImage != '')
                                {

                                    let pf_image = `./public/${user.profileImage}`;
                                    fs.unlink(pf_image, (err) => {
                                        if (err) {
                                            console.log('err', err);
                                        } else {
                                            console.log(user.profileImage + ' was deleted');
                                        }
                                    });
                                }

                                let imageUploaded = new Promise( (resolve,reject) => { 

                                    var pic = fileData.profileImage;
                                    var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                    var fileName = Date.now() + ext;
                                    var folderpath = config.UploadUserProfilePath;
                                    pic.mv(folderpath + fileName,  async (err) => {
                                        if (err) {
                                            reject(err)
                                            callback({
                                                "success": false,
                                                "STATUSCODE": 505,
                                                "message": "INTERNAL DB ERROR",
                                                "response": err
                                            })
                                        } else {
                                            //data._id = new ObjectID;
                                            if(data.profileImage == (config.UserProfilePath + fileName) )
                                            {

                                            }else{
                                                data.profileImage = config.UserProfilePath + fileName;
                                            }
                                            let filterProfileImage = []
                                            let filterMainProfileImage = []
                            
                                            if(user.profile)
                                            {
                                                if(user.profile.length > 0)
                                                {

                                                    filterProfileImage =  user.profile
                                                    .map( (userprofileimage) => {
                                    
                                                        userprofileimage.isMain = false
                                                        return userprofileimage
                                                    });

                                                                        
                                                    await UserSchema.update({_id: user._id}, {
                                                        $set: {"profile": filterProfileImage}           
                                                     });


                                                   user.profile.filter( async (userprofileimage) => {
                            
                                                        if(userprofileimage.media == user.profileImage)
                                                        {
                                          
                                                        
                                                            await UserSchema.update({_id: user._id, "profile._id":userprofileimage._id }, {
                                                                $set: {
                                                                    "profile.$.isMain": true,
                                                                    "profile.$.media": data.profileImage
                                                                }           
                                                            });

                                                            return userprofileimage
                                                        }
                                                    });
                            
                                                 }else{
                                                    await UserSchema.update({_id: user._id }, {
                                                        $set: {
                                                            "profile": [{
                                                                "isMain": true,
                                                                "media": data.profileImage
                                                            }]
                                                        }           
                                                    });
                                                 }
                                            }
                                            resolve(data.profileImage)
                                            console.log('image upload')
                                        }
                                    })

                                })

                                data.profileImage = await imageUploaded

                                await UserSchema.update({_id: user._id}, {
                                                $set: {"profileImage": data.profileImage}           
                                });
                            }

                            //selfieImage

                            if(fileData.selfieImage)
                            {

                                if (user.selfieImage !== undefined && user.selfieImage != '')
                                {

                                    let pf_image = `./public/${user.selfieImage}`;
                                    fs.unlink(pf_image, (err) => {
                                        if (err) {
                                            console.log('err', err);
                                        } else {
                                            console.log(user.selfieImage + ' was deleted');
                                        }
                                    });
                                }

                                let imageUploaded = new Promise( (resolve,reject) => { 

                                    var pic = fileData.selfieImage;
                                    var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                    var fileName = Date.now() + ext;
                                    var folderpath = config.UploadUserProfilePath;
                                    pic.mv(folderpath + fileName,  (err) => {
                                        if (err) {
                                            reject(err)
                                            callback({
                                                "success": false,
                                                "STATUSCODE": 505,
                                                "message": "INTERNAL DB ERROR",
                                                "response": err
                                            })
                                        } else {
                                            //data._id = new ObjectID;
                                            if(data.selfieImage == (config.UserProfilePath + fileName) )
                                            {

                                            }else{
                                                data.selfieImage = config.UserProfilePath + fileName;
                                            }
                                            resolve(data.selfieImage)
                                            console.log('image upload')
                                        }
                                    })

                                })

                                data.selfieImage = await imageUploaded

                                await UserSchema.update({_id: user._id}, {
                                                $set: {"selfieImage": data.selfieImage}           
                                });
                            }

                            // multiple image upload
                            
                            if(fileData.profile)
                            {
                                let uploadedArrayImage =  user.profile ? user.profile : []

                                if(fileData.profile.length)
                                {
                                    console.log('multiple image hitted')
                                    fileData.profile.map( async (imageprofile) => {

                                      
                                    let imageUploaded = new Promise( (resolve,reject) => { 
    
                                        var pic = imageprofile;
                                        var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                        var fileName = Date.now() + ext;
                                        var folderpath = config.UploadUserProfilePath;
                                        pic.mv(folderpath + fileName,  async (err) => {
                                            if (err) {
                                                reject(err)
                                                callback({
                                                    "success": false,
                                                    "STATUSCODE": 505,
                                                    "message": "INTERNAL DB ERROR",
                                                    "response": err
                                                })
                                            } else {
                                                //data._id = new ObjectID;
                                                if(data.profile == (config.UserProfilePath + fileName) )
                                                {
    
                                                }else{
                                                    data.profile = config.UserProfilePath + fileName;
                                                    if(uploadedArrayImage.length > 0 )
                                                    {
                                                        uploadedArrayImage.push({
                                                            media: data.profile
                                                        })

                                                    }else{
                                                    uploadedArrayImage.push({
                                                        media: data.profile,
                                                        isMain: true
                                                    });
                                                    data.profileImage = data.profile
                                                    }

                                                }
                                                resolve(uploadedArrayImage)
                                                console.log('image upload')
                                            }
                                        })
    
                                    })
                                    
                                   // console.log('uploadedArrayImage 1---->',await imageUploaded)
                                    data.profile = await imageUploaded
                                    
                                    await UserSchema.update({_id: user._id}, {
                                        $set: {"profile": data.profile}           
                                    });
                                    console.log('uploadedArrayImage.length---',uploadedArrayImage.length)
                                 if(uploadedArrayImage.length == 1 )
                                 {
                                    console.log('uploaded  enter---->')

                                    await UserSchema.update({_id: user._id}, {
                                        $set: {"profileImage": data.profileImage}           
                                    });
                                 }


                                })
                                    console.log('uploadedArrayImage 2---->',data.profile)
                                    //data.profile = uploadedArrayImage
                                }else{
                                    console.log('single image hitted')
                                   
                                    let imageUploaded = new Promise( (resolve,reject) => { 
    
                                        var pic = fileData.profile;
                                        var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                        var fileName = Date.now() + ext;
                                        var folderpath = config.UploadUserProfilePath;
                                        pic.mv(folderpath + fileName, async (err) => {
                                            if (err) {
                                                reject(err)
                                                callback({
                                                    "success": false,
                                                    "STATUSCODE": 505,
                                                    "message": "INTERNAL DB ERROR",
                                                    "response": err
                                                })
                                            } else {
                                                //data._id = new ObjectID;
                                                if(data.profile == (config.UserProfilePath + fileName) )
                                                {
    
                                                }else{
                                                    data.profile = config.UserProfilePath + fileName;

                                                    if(uploadedArrayImage.length > 0)
                                                    {
                                                        uploadedArrayImage.push({
                                                            media: data.profile
                                                        })
                                                    }else{
                                                        uploadedArrayImage.push({
                                                            media: data.profile,
                                                            isMain: true
                                                        })
                                                        
                                                        await UserSchema.update({_id: user._id}, {
                                                            $set: {"profileImage": data.profile}           
                                                        });
                                                    }
                                                }
                                                resolve(uploadedArrayImage)
                                                console.log('image upload')
                                            }
                                        })
    
                                    })
    
                                    data.profile = await imageUploaded
                                    await UserSchema.update({_id: user._id}, {
                                                    $set: {"profile": data.profile}           
                                    });
                                }
                            
                             }
                        }

                      let userUpdatedDetails = await UserSchema.findOne({_id: data.userId})
                      if(userUpdatedDetails !== null)
                      {
                          userUpdatedDetails.profileImage = userUpdatedDetails.profileImage !== undefined ?
                                                           userUpdatedDetails.profileImage:''
                          userUpdatedDetails.selfieImage = userUpdatedDetails.selfieImage !== undefined ?
                                                           userUpdatedDetails.selfieImage:''                                                           
                      }
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "User updated successfully.",
                            response: userUpdatedDetails
                           
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "User is not valid.",
                    response: {}
                });
            }

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    },

    //update Profile Image
    updateProfileImage: async function (data, fileData, callback) {
        if (data) {
            console.log('data------->',data)
            let user = await UserSchema.findOne({
                _id: data.userId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while editing user",
                        response: err
                    });
                }
            });

            if (user !== null) {
                let filterProfileImage = []
                let filterMainProfileImage = []

                if(user.profile)
                {
                    if(user.profile.length > 0)
                    {
                        filterMainProfileImage =  user.profile.filter( (userprofileimage) => {

                            if(userprofileimage._id == data.profileImageId)
                            {

                                return userprofileimage
                            }
                        });

                        filterProfileImage =  user.profile
                        .map( (userprofileimage) => {
        
                            userprofileimage.isMain = false
                            return userprofileimage
                        //    data.profileImageId
                        });
                     }
                }
               
                UserSchema.update({
                    _id: data.userId 
                }, {
                    $set: {
                        ...(( data.action == 'makemain')     ? { profile : filterProfileImage }             : {})
                    }
                }, async (err, resUpdate) => {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: err.message,
                            response: err
                        });
                    } else {

                        if( data.action == 'makemain' && user.profile )
                        {
                            if(user.profile.length > 0)
                            {
                                await UserSchema.update({_id: user._id, "profile._id":data.profileImageId }, {
                                    $set: {
                                        "profile.$.isMain": data.isMain,
                                        ...(filterMainProfileImage.length > 0 ?  {"profileImage": filterMainProfileImage.map( (mainImg) => { return  mainImg.media }) } : {} ),

                                    }           
                                });

                            }
                        }else if(data.action == 'delete' && user.profile )
                        {
                            if(user.profile.length > 0)
                            {
                                filterProfileImage =  user.profile
                                .filter( userprofileimage => userprofileimage._id !=  data.profileImageId );
                                console.log('filterProfileImage--->',filterProfileImage)

                                await UserSchema.update({_id: user._id }, {
                                    $set: {
                                        "profile": filterProfileImage
                                    }           
                                });

                            }

                        }
                        console.log('fileData-------->',fileData);
                        
                        if( fileData && fileData !== null){

                            //profileImage

                            if(fileData.profile)
                            {

                               let filterImage =  user.profile.filter( (userprofileimage) => {

                                    if(userprofileimage._id == data.profileImageId)
                                    {

                                        return userprofileimage
                                    }
                                //    data.profileImageId
                                });
                                //console.log('file index--->',index[0].media)
                                if (filterImage.length > 0) {

                                    filterImage.map( async (profileimg) => {  
                           
                                        if (profileimg !== undefined && profileimg != '')
                                        {

                                            let pf_image = `./public/${profileimg.media}`;
                                            fs.unlink(pf_image, (err) => {
                                                if (err) {
                                                    console.log('err', err);
                                                } else {
                                                    console.log(profileimg.media + ' was deleted');
                                                }
                                            });
                                        }

                                        let imageUploaded = new Promise( (resolve,reject) => { 
            
                                            var pic = fileData.profile;
                                            var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                            var fileName = Date.now() + ext;
                                            var folderpath = config.UploadUserProfilePath;
                                            pic.mv(folderpath + fileName,  (err) => {
                                                if (err) {
                                                    reject(err)
                                                    callback({
                                                        "success": false,
                                                        "STATUSCODE": 505,
                                                        "message": "INTERNAL DB ERROR",
                                                        "response": err
                                                    })
                                                } else {
                                                    //data._id = new ObjectID;
                                                    if(data.profile == (config.UserProfilePath + fileName) )
                                                    {

                                                    }else{
                                                        data.profile = config.UserProfilePath + fileName;
                                                        // uploadedArrayImage.push({
                                                        //     media: data.profile
                                                        // })
                                                    }
                                                    resolve(data.profile)
                                                    console.log('image upload')
                                                }
                                            })

                                        })

                                        let updatedProfileImg = await imageUploaded

                                        //data.profile = await imageUploaded

                                        await UserSchema.update({_id: user._id, "profile._id":data.profileImageId }, {
                                                        $set: {
                                                            "profile.$.media": updatedProfileImg,
                                                        }           
                                        });
                            })
                            }
                            }
                        }

                      let userUpdatedDetails = await UserSchema.findOne({_id: data.userId})
                      
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Personal information has been updated.",
                            response: userUpdatedDetails
                           
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "User is not valid.",
                    response: {}
                });
            }

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    },

    // Delete User Information
    deleteUser: async function (data,  callback) {
        if (data) {

            let admin = await UserSchema.findOne({
                _id: data.userId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while removing admin",
                        response: err
                    });
                }
            });

            if (admin !== null) {


                if (admin.profileImage !== undefined && admin.profileImage != '')
                {

                    let pf_image = `./public/${admin.profileImage}`;
                    fs.unlink(pf_image, (err) => {
                        if (err) {
                            console.log('err', err);
                        } else {
                            console.log(admin.profileImage + ' was deleted');
                        }
                    });
                }

                UserSchema.remove({
                    _id: data.userId
                }, async (err, resRemoved) => {

                if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "INTERNAL DB ERROR",
                            response: err
                        });
                } else {

                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "User removed Successfully.",
                            response: {}
                        
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "User is not valid.",
                    response: {}
                });
            }

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    },
    
    // List Terms
    listTerms: function (data, callback) {
        console.log('data----',data)

        var page = 1,
        limit = 3,
        query = {},
        queryName = {};

        if (data.page) {
            page = parseInt(data.page);
        }

        if (data.limit) {
            limit = parseInt(data.limit);
        }

        if(data.termId){
            query['_id'] = data.termId
        }           

        var aggregate = TermsSchema.aggregate();
        aggregate.match(query);
        aggregate.sort({
            'updatedAt': -1
        })

        var options = {
            page: page,
            limit: limit
        }

        TermsSchema.aggregatePaginate(aggregate, options, function (err, results, pageCount, count) {
            if (err) {
                callback({
                    success: false,
                    STATUSCODE: 505,
                    message: err,
                    response: {}
                });

            } else {

                var data = {
                    docs:results,
                    pages: pageCount,
                    total: count,
                    limit: limit,
                    page: page
                }
                callback({
                    success: true,
                    STATUSCODE: 200,
                    message: "Terms List",
                    response: data
                });

            }
        });
     },

    // testNotification
    testNotification: async function (data, callback) {
        console.log('data----',data)
        
        const userDeviceId   =  data.deviceId
        let  fullname        = ''
        let  userAge         = ''
        let  userSpec        = ''
        let  userCity        = ''
        let  userCountry     = ''
        let  overallUserInfo = 'This is test message'

        //console.log('--udata data.userId---',data.userId)

        // if(data.userId){

        //     let udata = await UserSchema.findOne({_id:data.userId})
        //                       .populate('personal.specialization') 
        //     if(udata.personal.specialization.length>0)
        //     {
        //         async.each(udata.personal.specialization, (spec)=>{
        //             userSpec = userSpec + spec.name + ' ,'
        //         })
        //     }

        //     fullname    = udata.personal.fullname.indexOf(' ') > -1 ? (udata.personal.fullname.split(' '))[0] : udata.personal.fullname
        //     userAge     = udata.personal.age
        //     userSpec    = userSpec.substr(0, userSpec.length-1)
        //     userCity    = udata.personal.city
        //     userCountry = udata.personal.country

        //     overallUserInfo = fullname +', '+userAge+', in '+userCity+', '+userCountry
        // }
        // data.to_user = userSpecializationArray

        let message = overallUserInfo //+ ' Called to talk about ' + specializationNameArray.substr(0, specializationNameArray.length-1);
        
        let notificationResponse = await fcmNotification.fcmSentPush(data, userDeviceId, message)
        console.log('notificationResponse---->',notificationResponse)

        callback({
            success: true,
            STATUSCODE: 200,
            message: "test Notification",
            response: notificationResponse
        });
     },

    // Edit Terms Information
    editTerms: async function (data,  callback) {
        if (data) {

            let term = await TermsSchema.findOne({
                _id: data.termId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while editing term",
                        response: err
                    });
                }
            });

            if (term !== null) {

                TermsSchema.update({
                    _id: data.termId
                }, {
                    $set: {
                        description: data.description !== undefined ? data.description : term.description
                    }
                }, async (err, resUpdate) => {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "INTERNAL DB ERROR",
                            response: err
                        });
                    } else {


                      let termUpdatedDetails = await TermsSchema.findOne({_id: data.termId})
                 
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Term information has been updated.",
                            response: termUpdatedDetails
                           
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Terms is not valid.",
                    response: {}
                });
            }

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    },  

    // List PrivacyPolicy
    listPrivacyPolicy: function (data, callback) {
        console.log('data----',data)

        var page = 1,
        limit = 3,
        query = {},
        queryName = {};

        if (data.page) {
            page = parseInt(data.page);
        }

        if (data.limit) {
            limit = parseInt(data.limit);
        }

        if(data.privacyId){
            query['_id'] = data.privacyId
        }           

        var aggregate = PrivacySchema.aggregate();
        aggregate.match(query);
        aggregate.sort({
            'updatedAt': -1
        })

        var options = {
            page: page,
            limit: limit
        }

        PrivacySchema.aggregatePaginate(aggregate, options, function (err, results, pageCount, count) {
            if (err) {
                callback({
                    success: false,
                    STATUSCODE: 505,
                    message: err,
                    response: {}
                });

            } else {

                var data = {
                    docs:results,
                    pages: pageCount,
                    total: count,
                    limit: limit,
                    page: page
                }
                callback({
                    success: true,
                    STATUSCODE: 200,
                    message: "Privacy List",
                    response: data
                });

            }
        });
    },

    // Edit PrivacyPolicy Information
    editPrivacyPolicy: async function (data, callback) {
        if (data) {

            let term = await PrivacySchema.findOne({
                _id: data.privacyId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while editing term",
                        response: err
                    });
                }
            });

            if (term !== null) {

                PrivacySchema.update({
                    _id: data.privacyId
                }, {
                    $set: {
                        description: data.description !== undefined ? data.description : term.description
                    }
                }, async (err, resUpdate) => {
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "INTERNAL DB ERROR",
                            response: err
                        });
                    } else {


                        let termUpdatedDetails = await PrivacySchema.findOne({_id: data.privacyId})
                    
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Privacy information has been updated.",
                            response: termUpdatedDetails
                            
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Privacy is not valid.",
                    response: {}
                });
            }

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    } ,
       
    addFeedback: async function (data, callback) {
        console.log('data---',data)
        if (data) {

                    new FeedBackSchema(data).save( async (err, result) => {
                        if (err) {
                            callback({
                                    success: false,
                                    STATUSCODE: 505,
                                    message: "INTERNAL DB ERROR",
                                    response: []
                            });
                        } else {
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Thank you for your Feedback.",
                            response: result
                            
                        });
                    }
                });

        } else {
            callback({
                success: false,
                STATUSCODE: 505,
                message: "INTERNAL DB ERROR",
                response: {}
            });
        }
    } ,

    // List Country
    listCountry: async function (data, callback) {
        console.log('data----',data)

        var page = 1,
        limit = 3,
        query = {},
        queryName = {};
       
        var aggregate = await CountrySchema.find(query);

                var data = {
                    docs:aggregate,
                    total: aggregate.length
                }
                callback({
                    success: true,
                    STATUSCODE: 200,
                    message: "Country List",
                    response: data
                });
    },

    // List Ethnicity
    listEthnicity: async function (data, callback) {
        console.log('data----',data)

        var page = 1,
        limit = 3,
        query = {},
        queryName = {};
       
        var aggregate = await EthnicitySchema.find(query);

                var data = {
                    docs:aggregate,
                    total: aggregate.length
                }
                callback({
                    success: true,
                    STATUSCODE: 200,
                    message: "Ethnicity List",
                    response: data
                });
    },


}

async function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports = apiModel;