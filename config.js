module.exports = {
    "port": 3193,
    "secretKey": "hyrgqwjdfbw4534efqrwer2q38945765",
    "link_expire": 172800,
    dbAccess: 'server',
    local: {
        database: "mongodb://localhost:27017/calaf",
        MAIL_USERNAME: "liveapp.brainium@gmail.com",
        MAIL_PASS: "YW5kcm9pZDIwMTY"
    },
    database: {
        'server': {
            username: 'brain1uMMong0User',
            password: 'PL5qnU9nuvX0pBa',
            host: 'nodeserver.mydevfactory.com',
            port: '27017',
            dbName: 'calaf',
            authDb: 'admin'
        },
        'local': {
            port: 27017,
            host: "localhost",
            dbName: "calaf"
        }
    },
    email: {
        database: "mongodb://localhost:27017/calaf",
        MAIL_USERNAME: "liveapp.brainium@gmail.com",
        MAIL_PASS: "YW5kcm9pZDIwMTY"
    },
    twillow: {
        live: {
            accountSid: "AC60641b0365287e334555796ca998d402",
            authToken: "a702091fd4c8089a7f7e80ff6ae2dfed",
            from_no: "+12062600506"
        },
        test: {
            accountSid: "AC3f4b8426a5026d7441f19a8b6c68fc18",
            authToken: "823efaec212bb07953b54a00f87a8ebd",
            from_no: "+15005550006"
        }
    },
    google_location_options: {
        provider: 'google',
        // Optional depending on the providers 
        httpAdapter: 'https', // Default 
        apiKey: 'AIzaSyAZrlEyL0r3AX-KVpZCRBEINPtQQ9wIZhI',
        // This api key needs to change before live because it is taken from another project
        formatter: null // 'gpx', 'string', ... 
    },
    AdminProfilePath: "uploads/admin/profilePic/",
    UploadAdminProfilePath:'public/uploads/admin/profilePic/',
    UserProfilePath: "uploads/user/profilePic/",
    UploadUserProfilePath:'public/uploads/user/profilePic/',
    userDemoPicPath: "uploads/dummy/demo-profile.png",
    

    // socketUrl: "https://nodeserver.mydevfactory.com:1426/",
    //liveUrl: "http://localhost:3193/",
    liveUrl: "https://nodeserver.mydevfactory.com:3193/",
    baseUrl: "https://nodeserver.mydevfactory.com/RAJEEV/calaf/admin/#/",
    logPath: "/ServiceLogs/admin.debug.log",
    dev_mode: true,
    __root_dir: __dirname,
    __site_url: '',
    limit: 10

}