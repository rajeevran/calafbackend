'use strict';
var config = require('../config');
var async = require("async");
var mongo = require('mongodb');
var jwt = require('jsonwebtoken');
var fs = require('fs')
var ObjectID = mongo.ObjectID;

var mailProperty = require('../modules/sendMail');

var ApiModels = require('../models/api/apiModel');
var apiService = {

        //register User
        register: (data, callback) => {

            // Phone Number: (Op੎onal Filed) ● Password: (Mandatory Filed)
            // Full Name: (Mandatory Filed)
            // Gender: (Mandatory Filed)
            // Date of Birth: (Mandatory Filed)
            // Email ID: (Mandatory Filed)
            // Phone Number: (Optional Filed)
            // Password: (Mandatory Filed)
console.log('valid data---->',data)
            if (!data.fullName || typeof data.fullName === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide fullName",
                    response: []
                });
            } else if (!data.gender || typeof data.gender === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide gender",
                    response: []
                });
            } else if (!data.phoneNumber || typeof data.phoneNumber === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide phoneNumber",
                    response: []
                });
            } else if (!data.email || typeof data.email === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide email",
                    response: []
                });
            } else if (!data.password || typeof data.password === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide password",
                    response: []
                });
            } else {
    
                data._id = new ObjectID;
                data.email = String(data.email).toLowerCase();
    
                ApiModels.register(data, function (result) {
                    callback(result);
                });
            }
        },
        
        //verifyEmailOtp 
        verifyEmailOtp: (data, callback) => {
            if (!data.email || typeof data.email === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide email address",
                    response: []
                });
            } else if (!data.otp || typeof data.otp === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide otp",
                    response: []
                });
            } else {
                ApiModels.verifyEmailOtp(data, function (result) {
                    callback(result);
                });
            }
        },
        //login 
        login: (data, callback) => {
            if (!data.email || typeof data.email === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide email address",
                    response: []
                });
            } else if (!data.password || typeof data.password === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide password",
                    response: []
                });
            } else if (!data.deviceToken || typeof data.deviceToken === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide deviceToken",
                    response: []
                });
            } else if (!data.appType || typeof data.appType === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide appType",
                    response: []
                });
            } else {
                ApiModels.login(data, function (result) {
                    callback(result);
                });
            }
        },

        // Social Login
        socialRegister: (data, callback) => {
        
            if (!data.socialLogin || typeof data.socialLogin === undefined) {
                callback({
                success: false,
                STATUSCODE: 5002,
                message: "socialLogin  Required ",
                response: {}
                });

            } else {
                data.email = data.email?String(data.email).toLowerCase():'';
                ApiModels.socialRegister(data, function (result) {
                callback(result);
            });
            }
        },

        //Forgot password
        forgotPassword: (data, callback) => {
            if (!data.email || typeof data.email === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide email address",
                    response: []
                });
            } else {

                ApiModels.forgotPassword(data, function (result) {
                    callback(result);
                });
            }
        },        

        //reset password 
        resetPassword: (data, callback) => {
            if (!data.userId || typeof data.userId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide user id",
                    response: []
                });
            } else if (!data.newPassword || typeof data.newPassword === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "please provide password",
                    response: []
                });
            } else {
                ApiModels.resetPassword(data, function (result) {
                    callback(result);
                });
            }
        },

        //listUser
        listUser: function (data, callback) {
            console.log("data",data); 
            ApiModels.listUser(data, function (result) {
                callback(result);
            });
        },

        
        //reportedUserList
        reportedUserList: function (data, callback) {
            console.log("data",data); 
            ApiModels.reportedUserList(data, function (result) {
                callback(result);
            });
        },


        //testNotification
        testNotification: function (data, callback) {
            console.log("data",data); 
            ApiModels.testNotification(data, function (result) {
                callback(result);
            });
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

                        ApiModels.editUser(data, fileData, function (result) {
                        callback(result)
                        });
                }
        },
        
        //Edit ProfileImage
        updateProfileImage: async (data, fileData, callback) => {

                if (!data.userId || typeof data.userId === undefined) {
                        callback({
                            success: false,
                            STATUSCODE: 404,
                            message: "Please Provide User Id",
                            response: []
                        });
                }else if (!data.profileImageId || typeof data.profileImageId === undefined) {
                    callback({
                        success: false,
                        STATUSCODE: 404,
                        message: "Please Provide Profile Image Id",
                        response: []
                    });
                }else if (!data.action || typeof data.action === undefined) {
                    callback({
                        success: false,
                        STATUSCODE: 404,
                        message: "Please Provide action",
                        response: []
                    });
                } else {

                        ApiModels.updateProfileImage(data, fileData, function (result) {
                        callback(result)
                        });
                }
        },
        //Delete User
        deleteUser: async (data, callback) => {

            if (!data.userId || typeof data.userId === undefined) {
                    callback({
                        success: false,
                        STATUSCODE: 404,
                        message: "Please Provide User Id",
                        response: {}
                    });
            } else {
                    ApiModels.deleteUser(data, function (result) {
                    callback(result)
                    });
            }
        },
         
        //listTerms
        listTerms: function (data, callback) {
            console.log("data",data); 
            ApiModels.listTerms(data, function (result) {
                callback(result);
            });
        },

        //Edit Terms
        editTerms: async (data,  callback) => {
            if (!data.termId || typeof data.termId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide Term Id",
                    response: {}
                });
            } else {
                ApiModels.editTerms(data, function (result) {
                callback(result)
                });
            }
           
        },
        
        //listPrivacyPolicy
        listPrivacyPolicy: function (data, callback) {
            console.log("data",data); 
            ApiModels.listPrivacyPolicy(data, function (result) {
                callback(result);
            });
        },

        //listCountry
        listCountry: function (data, callback) {
            console.log("data",data); 
            ApiModels.listCountry(data, function (result) {
                callback(result);
            });
        },


        //listEthnicity
        listEthnicity: function (data, callback) {
            console.log("data",data); 
            ApiModels.listEthnicity(data, function (result) {
                callback(result);
            });
        },

        //Edit PrivacyPolicy
        editPrivacyPolicy: (data,  callback) => {
            
            if (!data.privacyId || typeof data.privacyId === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide Privacy Id",
                    response: {}
                });
            } else {
                ApiModels.editPrivacyPolicy(data, function (result) {
                callback(result)
                });
            }

        },
        
        //addFeedback
        addFeedback: (data,  callback) => {
            
            if (!data.fromUser || typeof data.fromUser === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide fromUser Id",
                    response: {}
                });
            }else  if (!data.toUser || typeof data.toUser === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide toUser ",
                    response: {}
                });
            }else  if (!data.title || typeof data.title === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide title ",
                    response: {}
                });
            }else  if (!data.message || typeof data.message === undefined) {
                callback({
                    success: false,
                    STATUSCODE: 404,
                    message: "Please Provide message ",
                    response: {}
                });
            } else {
                data._id = new ObjectID;
                ApiModels.addFeedback(data, function (result) {
                callback(result)
                });
            }
        },                
    };
module.exports = apiService;