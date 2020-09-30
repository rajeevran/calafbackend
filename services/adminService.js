var config = require('../config');
var async = require("async");
var mongo = require('mongodb');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt-nodejs');
var ObjectID = mongo.ObjectID;
var randomize = require('randomatic');
var mongoose = require('mongoose');

var AdminSchema = require('../schema/admin/admin');

//======================MONGO MODELS============================
var AdminModels = require('../models/admin/adminModel');

// var VehicleType = require('../../models/');
var mailProperty = require('../modules/sendMail');
var secretKey = config.secretKey;

var adminService = {
    jwtAuthVerification: (jwtData, callback) => {
        
        if (jwtData["x-access-token"]) {
            AdminModels.authenticate(jwtData, function (auth) {
                callback(auth);
            })
        } else {
            callback({
                success: false,
                STATUSCODE: 4200,
                message: "token missing",
                response: {}
            })
        }
    },
   
    adminSignup: function (adminData, callback) {
        if (!adminData.email) {
            callback({
                success: false,
                message: "please enter email"
            });
        }
        if (!adminData.password) {
            callback({
                success: false,
                message: "please enter password"
            });
        }
        if (!adminData.name) {
            callback({
                success: false,
                message: "please enter name"
            });
        }
        
        async.waterfall([
            function (nextcb) {       //checking email existance
                var cError1 = "";
                AdminSchema.findOne({ email: adminData.email }, function (err, admindet) {
                    if (err)
                        nextcb(err);
                    else {
                        if (admindet) {
                            cError1 = "email already taken";
                        }
                        nextcb(null, cError1);
                    }
                });
            },
            function (cError1, nextcb) {    //updating admin's data
                if (cError1) {
                    nextcb(null, cError1);
                } else {
                    var admin = new AdminSchema(adminData);
                    admin.save(function (err) {
                        if (err) {
                            nextcb(err);
                        } else {
                            nextcb(null, cError1);
                        }
                    });
                }
            }

        ], function (err, cError) {
            if (err) {
                callback({ success: false, message: "some internal error has occurred", err: err });
            } else if (cError != "") {
                callback({ success: false, message: cError });
            } else {
                callback({ success: true, message: "AdminSchema saved successfully" })
            }
        });
    },

    adminLogin: function (adminData, callback) {
        console.log("data",adminData); 
        var id = "0";
        let deviceId = adminData.deviceId
        let email = adminData.email
        let phoneNumber = adminData.phoneNumber
        let query = {}
        if(adminData.email)
        {
            query["email"] = email
        }

        if(adminData.phoneNumber)
        {
            query["phoneNumber"] = phoneNumber
        }
        
        if ( (adminData.email || adminData.phoneNumber) && adminData.password) {

            AdminSchema.findOne(query)
                .select('password firstName lastName email permission profileImage authtoken')
                .lean(true)
                .then(function (loginRes) {
                    console.log("loginRes",loginRes);
                    
                    if (!loginRes) {
                        callback({
                            success: false,
                            STATUSCODE: 4000,
                            message: "User doesn't exist",
                            response: {}
                        });
                    } else {
                        //if (!loginRes.comparePassword(adminData.password)) {
                        var c = bcrypt.compareSync(adminData.password, loginRes.password);
                        console.log("compare",c);
                        
                        if (!c){

                            callback({
                                success: false,
                                STATUSCODE: 4000,
                                message: "User name or password is wrong",
                                response: {}
                            });
                        } else {
                            var token = jwt.sign({
                                email: adminData.email,
                                adminId: loginRes._id,
                                userType: loginRes.userType
                            }, config.secretKey, { expiresIn: '12h' });

                            AdminSchema.update({
                                _id: loginRes._id
                            }, {
                                $set: {
                                    authtoken: token
                                }
                            }, function (err, resUpdate) {
                                if (err) {
                                    
                                } else {
                                    
                                    let profile_image = loginRes.profileImage;

                                    if (!profile_image || profile_image == '') {
                                        profile_image = config.userDemoPicPath;
                                    } else {
                                        profile_image = loginRes.profileImage;
                                    }

                                    callback({
                                        success: true,
                                        STATUSCODE: 2000,
                                        message: "Login success",
                                        response: {
                                            email: adminData.email,
                                            token: token,
                                            deviceId:deviceId?deviceId:null,
                                            "id": loginRes._id,
                                            "permission": loginRes.permission,
                                            "name": loginRes.firstName + " " +loginRes.lastName,
                                            "profileImage": profile_image,
                                            "status": loginRes.status
                                        }
                                    })
                                }
                            });
                           
                        }
                    }

                });
        } else {
            callback({
                success: false,
                STATUSCODE: 5000,
                message: "Insufficient information provided for user login",
                response: {}
            });
        }
    },

    listAdmin: function (adminData, callback) {
        console.log("data",adminData); 
        AdminModels.listAdmin(adminData, function (result) {
            callback(result);
        });
    },

    //Add Admin
    addAdmin: async (adminData, fileData, callback) => {

        if (!adminData.firstName || typeof adminData.firstName === undefined) {
            callback({
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide First Name",
                response: []
            });
        } else if (!adminData.lastName || typeof adminData.lastName === undefined) {
            callback(null, {
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Last Name",
                response: []
            });
        } else if (!adminData.email || typeof adminData.email === undefined) {
            callback(null, {
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Email Address",
                response: []
            });
        } else if (!adminData.password || typeof adminData.password === undefined) {
            callback(null, {
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Password",
                response: []
            });
        } else {
            
            let hashedPassword =  bcrypt.hashSync(adminData.password, bcrypt.genSaltSync(10), null);
            
            adminData._id       = new ObjectID;
            adminData.password  = hashedPassword;
            adminData.email     = String(adminData.email).toLowerCase();

            AdminModels.addAdmin(adminData, fileData, function (result) {
            callback(result)
            });

            }
    },

    //Edit User
    editAdmin: async (data, fileData, callback) => {

        if (!data.adminId || typeof data.adminId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 4004,
                    message: "Please Provide Admin Id",
                    response: []
                });
        } else {
                AdminModels.editAdmin(data, fileData, function (result) {
                callback(result)
                });
        }
    },

    //Delete User
    deleteAdmin: async (data, callback) => {

        if (!data.adminId || typeof data.adminId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 4004,
                    message: "Please Provide Admin Id",
                    response: []
                });
        } else {
                AdminModels.deleteAdmin(data, function (result) {
                callback(result)
                });
        }
    },

    //Add User
    addUser: async (adminData, fileData, callback) => {

        if (!adminData.fullName || typeof adminData.fullName === undefined) {
            callback({
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Full Name",
                response: []
            });
        } else if (!adminData.email || typeof adminData.email === undefined) {
            callback(null, {
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Email Address",
                response: []
            });
        } else if (!adminData.password || typeof adminData.password === undefined) {
            callback(null, {
                success: false,
                STATUSCODE: 4004,
                message: "Please Provide Password",
                response: []
            });
        } else {
            
            let hashedPassword =  bcrypt.hashSync(adminData.password, bcrypt.genSaltSync(10), null);
            
            adminData._id       = new ObjectID;
            adminData.password  = hashedPassword;
            adminData.email     = String(adminData.email).toLowerCase();

            AdminModels.addUser(adminData, fileData, function (result) {
            callback(result)
            });

            }
    },
    //Edit User
    editUser: async (data, fileData, callback) => {

        if (!data.userId || typeof data.userId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide User Id",
                    response: []
                });
        } else {

            AdminModels.editUser(data, fileData, function (result) {
                callback(result)
                });
        }
    },
    //User Change password
    changePassword: async (data,  callback) => {
        if (!data.token || typeof data.token === undefined) {
            callback({
                success: false,
                STATUSCODE: 4004,
                message: "please provide token ",
                response: []
            });
        }  else {
            AdminModels.changePassword(data, function (result) {
                callback(result);
            });
        }
    },

    //User forgot password
    forgotPassword: (data, callback) => {
        if (!data.email || typeof data.email === undefined) {
            callback({ 
                success: false,
                STATUSCODE: 5002,
                message: "Email Id Required ",
                response: {}
                });
            }else if (!data.password || typeof data.password === undefined) {
                callback({ 
                    success: false,
                    STATUSCODE: 5002,
                    message: "Password  Required ",
                    response: {}
                    });
                } else {
            //data.password = randomize('*', 6);
            AdminModels.forgotpassword(data, function (result) {
                mailProperty('forgotPasswordMail')(String(data.email).toLowerCase(), {
                    password: data.password,
                    email: String(data.email).toLowerCase(),
                    name: result.response.fullname,
                    date: new Date(),
                    logo: config.liveUrl + '' + config.siteConfig.LOGO,
                    site_color: config.siteConfig.SITECOLOR,
                    site_name: config.siteConfig.SITENAME
                }).send();
                callback({
                    success: true,
                    STATUSCODE: result.STATUSCODE,
                    message: result.message,
                    response: {}
                    });
            });
        }

    },

    // Social Login
    socialRegister: (data, callback) => {
    if (!data.email || typeof data.email === undefined) {
        callback({
            success: false,
            STATUSCODE: 5002,
            message: "email  Required ",
            response: {}
        });
    }else if (!data.socialLogin || typeof data.socialLogin === undefined) {
        callback({
            success: false,
            STATUSCODE: 5002,
            message: "socialLogin  Required ",
            response: {}
        });
        
    } else {
        data.email = String(data.email).toLowerCase();
        AdminModels.socialRegister(data, function (result) {
            callback(result);
        });
    }
    },
    listUser: function (data, callback) {
        console.log("data",data); 
        AdminModels.listUser(data, function (result) {
            callback(result);
        });
    },
    // Send Email
    sendEmail: (data, callback) => {
        if (!data.email || typeof data.email === undefined) {
            callback({
                success: false,
                STATUSCODE: 5002,
                message: "email  Required ",
                response: {}
            });
        }else {
            data.email = String(data.email).toLowerCase();
            AdminModels.sendEmail(data, function (result) {
                callback(result);
            });
        }
    },
}

module.exports = adminService;