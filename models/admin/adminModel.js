
var AdminSchema = require('../../schema/admin/admin');
var UserSchema = require('../../schema/api/users');

var config = require('../../config');
var async = require("async");
var bcrypt = require('bcrypt-nodejs');
var mailProperty = require('../../modules/sendMail');
var jwt = require('jsonwebtoken');
var jwtOtp = require('jwt-otp');
var fs = require('fs');
var mongoose = require('mongoose');
var ObjectID = mongoose.Types.ObjectId;
var secretKey = config.secretKey;

//create auth token
createToken = (admin) => {
    var tokenData = {
        id: admin._id
    };
    var token = jwt.sign(tokenData, secretKey, {
        expiresIn: 86400
    });
    return token;
};

var commonModel = {

    authenticate: function (jwtData, callback) {
        if (jwtData["x-access-token"]) {
            jwt.verify(jwtData["x-access-token"], config.secretKey, function (err, decoded) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 400,
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

    changePassword: async function (data, callback) {
        console.log('data----',data)
    
            //====JWT Token verification
            var decoded = await jwt.verify(data.token, secretKey);

            console.log('decoded---->',decoded)
            data.adminId = decoded.adminId
            console.log('data after decoded---->',data)

            if (decoded !== null) {

                    AdminSchema.findOne({
                        _id: data.adminId
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
                                    STATUSCODE: 502,
                                    message: "Admin does not exist",
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
                                        AdminSchema.update({
                                            _id: resDetails._id
                                        }, {
                                            $set: {
                                                "password": hash
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
                                                    name: resDetails.firstName +' '+resDetails.lastName,
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
                
            }else{

                callback({
                    success: false,
                    STATUSCODE: 505,
                    message: "Token not provided",
                    response: {}
                }); 

            }
        
    },
    sendEmail: async function (data, callback) {
        console.log('data----',data)

                    try{
                        mailProperty('adminToUserMail')(data.email, {
                            name            : data.name,
                            adminresponse   : data.adminresponse,
                            site_url        : config.liveUrl,
                            date            : new Date()
                        }).send();
    
                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Mail Sent Successfully.Please check your registered email.",
                            response: { status: "success" }
                        });

                    }catch(err){

                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: err.message,
                            response: err
                        });

                    }
            
    },

    forgotpassword: function (data, callback) {
        console.log('data----',data)

            AdminSchema.findOne({
                email: data.email.toLowerCase()
            }, {
                fullname: 1
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
                            STATUSCODE: 502,
                            message: "User does not exist",
                            response: {}
                        });
                    } else {
                        bcrypt.hash(data.password, null, null, function (err, hash) {
                            if (err) {
                                callback({
                                    success: false,
                                    STATUSCODE: 505,
                                    message: "INTERNAL DB ERROR",
                                    response: err
                                });
                            } else {
                                AdminSchema.update({
                                    _id: resDetails._id
                                }, {
                                    $set: {
                                        password: hash
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
                                        callback({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: "Password changed.Please check your registered email.",
                                            response: resDetails
                                        });
                                    }
                                });
                            }
                        });

                    }
                }
            });
        
    },

    listAdmin: function (data, callback) {
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

        if(data.adminId){
            query['_id'] = data.adminId
        }           

        if(data.firstName){
            query['firstName'] = data.firstName
        }   

        if (data.searchName) {
            queryName = {
                "$or": [{
                    "firstName": new RegExp(data.searchName, 'i')
                }, {
                    "lastName": new RegExp(data.searchName, 'i')
                }]
            }
        }


        query = ( data.searchName !== undefined || data.searchName !== '' ) ? { ...query ,...queryName} : query

        //searchArray.push({'description': new RegExp(data.searchTerm, 'i')});

        var aggregate = AdminSchema.aggregate();
        aggregate.match(query);
        aggregate.sort({
            'updatedAt': -1
        })

        var options = {
            page: page,
            limit: limit
        }

        AdminSchema.aggregatePaginate(aggregate, options, function (err, results, pageCount, count) {
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
                    message: "Admin List",
                    response: data//[...results]
                });

            }
        });

     },

    addAdmin: async function (data, fileData, callback) { 
        
    console.log('data----',data)

        if (data) {
            AdminSchema.findOne({
                    email: data.email
                }, {
                    _id: 1,
                    email: 1,
                },
                  (err, result) =>{
                    if (err) {
                        callback({
                            success: false,
                            STATUSCODE: 505,
                            message: "INTERNAL DB ERROR",
                            response: []
                        });
                    } else {
                        if (result != null) {
                            callback({
                                success: false,
                                STATUSCODE: 4004,
                                message: "Email address already exist",
                                response: result
                            });
                        } else {

                                new AdminSchema(data).save( async (err, result) => {
                                    if (err) {
                                        callback({
                                                success: false,
                                                STATUSCODE: 505,
                                                message: "INTERNAL DB ERROR",
                                                response: []
                                        });
                                    } else {
                                        console.log('fileData-------->',fileData);

                                        if( fileData && fileData !== null){
                                    
                                                let imageUploaded = new Promise( (resolve,reject) => { 

                                                    var pic = fileData.profileImage;
                                                    var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                                    var fileName = Date.now() + ext;
                                                    var folderpath = config.UploadAdminProfilePath;
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
                                                            if(data.profileImage == (config.AdminProfilePath + fileName) )
                                                            {

                                                            }else{
                                                                data.profileImage = config.AdminProfilePath + fileName;
                                                            }
                                                            resolve(data.profileImage)
                                                            console.log('image upload')
                                                        }
                                                    })

                                            })

                                            data.profileImage = await imageUploaded

                                            let updateResponse = await AdminSchema.update({_id: result._id}, {
                                                            $set: {"profileImage": data.profileImage}           
                                                            });
                                        }

                                    let findAdminResponse = await AdminSchema.findOne({_id: result._id})
                                    if(findAdminResponse !== null)
                                    {
                                        findAdminResponse.profileImage = findAdminResponse.profileImage !== undefined ?
                                                                         config.liveUrl+findAdminResponse.profileImage:''
                                    }

                                    callback({
                                            success: true,
                                            STATUSCODE: 200,
                                            message: "Admin registered successfully.",
                                            response: findAdminResponse
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

    // Edit Admin Information
    editAdmin: async function (data, fileData, callback) {

        console.log('edit data-------->', data);
        
        if (data) {

            let admin = await AdminSchema.findOne({
                _id: data.adminId
            }, function (err, result) {
                if (err) {
                    callback({
                        success: false,
                        STATUSCODE: 505,
                        message: "Error Occur while editing admin",
                        response: err
                    });
                }
            });

            if (admin !== null) {

                console.log('data.password---',typeof(data.password))
                let hash = bcrypt.hashSync(data.password);
                console.log('hash---',hash)
                console.log('admin.password---',admin.password)

                AdminSchema.update({
                    _id: data.adminId
                }, {
                    $set: {
                        firstName: data.firstName !== undefined ? data.firstName : admin.firstName,
                        ...(( data.password)     ? { password : hash }             : {}),
                        lastName: data.lastName !== undefined ? data.lastName : admin.lastName,
                        profileImage: data.profileImage !== undefined ? data.profileImage : admin.profileImage,
                        email: data.email !== undefined ? data.email : admin.email,
                        status: data.status !== undefined ? data.status : admin.status
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

                        console.log('fileData-------->',fileData);
                        
                        if( fileData && fileData !== null){

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

                            let imageUploaded = new Promise( (resolve,reject) => { 

                                var pic = fileData.profileImage;
                                var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                var fileName = Date.now() + ext;
                                var folderpath = config.UploadAdminProfilePath;
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
                                        if(data.profileImage == (config.AdminProfilePath + fileName) )
                                        {

                                        }else{
                                            data.profileImage = config.AdminProfilePath + fileName;
                                        }
                                        resolve(data.profileImage)
                                        console.log('image upload')
                                    }
                                })

                        })

                        data.profileImage = await imageUploaded

                        await AdminSchema.update({_id: admin._id}, {
                                        $set: {"profileImage": data.profileImage}           
                                        });
                      }

                      let adminUpdatedDetails = await AdminSchema.findOne({_id: data.adminId})
                      if(adminUpdatedDetails !== null)
                      {
                          adminUpdatedDetails.profileImage = adminUpdatedDetails.profileImage !== undefined ?
                                                           config.liveUrl+adminUpdatedDetails.profileImage:''
                      }

                        callback({
                            success: true,
                            STATUSCODE: 200,
                            message: "Admin updated successfully.",
                            response: adminUpdatedDetails
                           
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 4004,
                    message: "Admin is not valid.",
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
    
    // Delete Admin Information
    deleteAdmin: async function (data,  callback) {
        if (data) {

            let admin = await AdminSchema.findOne({
                _id: data.adminId
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

                AdminSchema.remove({
                    _id: data.adminId
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
                            message: "Admin removed Successfully.",
                            response: {}
                        
                        });
                    }
                });

            } else {
                callback({
                    success: false,
                    STATUSCODE: 4004,
                    message: "Admin is not valid.",
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

    addUser: async function (data, fileData, callback) {
        console.log('data----',data)
    
            if (data) {
                UserSchema.findOne({
                        email: data.email
                    }, {
                        _id: 1,
                        email: 1,
                    },
                      (err, result) =>{
                        if (err) {
                            callback({
                                success: false,
                                STATUSCODE: 505,
                                message: "INTERNAL DB ERROR",
                                response: []
                            });
                        } else {
                            if (result != null) {
                                callback({
                                    success: false,
                                    STATUSCODE: 4004,
                                    message: "Email address already exist",
                                    response: result
                                });
                            } else {
    
                                    new UserSchema(data).save( async (err, result) => {
                                        if (err) {
                                            callback({
                                                    success: false,
                                                    STATUSCODE: 505,
                                                    message: "INTERNAL DB ERROR",
                                                    response: []
                                            });
                                        } else {
                                            console.log('fileData-------->',fileData);
    
                                            if( fileData && fileData !== null){
                                        
                                                    let imageUploaded = new Promise( (resolve,reject) => { 
    
                                                        var pic = fileData.profileImage;
                                                        var ext = pic.name.slice(pic.name.lastIndexOf('.'));
                                                        var fileName = Date.now() + ext;
                                                        var folderpath = config.UploadAdminProfilePath;
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
                                                                if(data.profileImage == (config.AdminProfilePath + fileName) )
                                                                {
    
                                                                }else{
                                                                    data.profileImage = config.AdminProfilePath + fileName;
                                                                }

                                                                await UserSchema.update({_id: result._id}, {
                                                                    $set: {
                                                                        "profile": [{
                                                                            media: data.profileImage,
                                                                            isMain: true
                                                                        }
                                                                        ]
                                                                    }           
                                                                });

                                                                resolve(data.profileImage)
                                                                console.log('image upload')
                                                            }
                                                        })
    
                                                })
    
                                                data.profileImage = await imageUploaded
    
                                                let updateResponse = await UserSchema.update({_id: result._id}, {
                                                                $set: {"profileImage": data.profileImage}           
                                                                });


                                                //selfieImage

                                                if(fileData.selfieImage)
                                                {

                                                    if (result.selfieImage !== undefined && result.selfieImage != '')
                                                    {

                                                        let pf_image = `./public/${result.selfieImage}`;
                                                        fs.unlink(pf_image, (err) => {
                                                            if (err) {
                                                                console.log('err', err);
                                                            } else {
                                                                console.log(result.selfieImage + ' was deleted');
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

                                                    await UserSchema.update({_id: result._id}, {
                                                                    $set: {"selfieImage": data.selfieImage}           
                                                    });
                                                }                                                                
                                                
                                            
                                            }
    
                                        let findUserResponse = await UserSchema.findOne({_id: result._id})
                                        if(findUserResponse !== null)
                                        {
                                            findUserResponse.profileImage = findUserResponse.profileImage !== undefined ?
                                                                             findUserResponse.profileImage:''
                                        }
    
                                        callback({
                                                success: true,
                                                STATUSCODE: 200,
                                                message: "User registered successfully.",
                                                response: findUserResponse
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
 
         
         if(data.age){
             query['age'] = parseInt(data.age)
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
 
         
 
         var aggregate = UserSchema.aggregate(
             {
                 $match: query
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
                     adminresponse : {
                         "$first": "$adminresponse"
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
                     updatedAt : {
                         "$first": "$updatedAt"
                     },
                     
                     visitedYouUserId : {
                         "$addToSet": "$visitedYouUserId"
                     },
     
                 }
             },
             {
                 $project : {
                     _id : 1,
                     fullName: 1,
                     profileImage: 1,
                     adminresponse:1,
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
                     updatedAt :1,
                     visitedYouUserId : 1
                 }
             }, 
             {
                 $sort: {"updatedAt": -1}
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
                        ...(( data.fullName)     ? { fullName : data.fullName }             : {}),
                        ...(( data.gender)       ? { gender : data.gender }                 : {}),
                        ...(( data.phoneNumber)  ? { phoneNumber : data.phoneNumber }       : {}),
                        ...(( data.email)        ? { email : data.email }                   : {}),
                        ...(( data.dob !== undefined && data.dob !== 'undefined' && data.dob !== 'null')          ? { dob : data.dob }                 : {}),
                        ...(( data.age !== undefined && data.age !== 'undefined' && data.age !== 'null')          ? { age : data.age }                 : {}),
                        ...(( data.location)     ? { location : data.location }             : {}),
                        ...(( data.adminresponse)? { adminresponse : data.adminresponse }   : {}),
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
}

module.exports = commonModel;