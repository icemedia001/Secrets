//jshint esversion:6
// required packages
require('dotenv').config();
const ejs = require("ejs");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();
// const md5 = require("md5");
// // const encrypt = require("mongoose-encryption");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: "Thisismytotolosecret.",
    resave: false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
//connecting database
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/userDB", 
{
    useNewUrlParser: true
});
//create user schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//encrypting password
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});
const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(
    function(user, done){
        done(null, user.id);
    });
passport.deserializeUser(
    function(id, done){
        User.findById(id, function(err, user){
            done(err, user);
        });
    });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//app.get code
app.get("/", function(req, res){
    res.render("home");
});
app.get("/auth/google",
passport.authenticate("google", { scope: ["profile"]})
);
app.get("/auth/google/secrets",
passport.authenticate("google", { failureRedirect: "/login"}),
function(req, res){
    res.redirect("/secrets");
}
);
app.get("/login", function(req, res){
    res.render("login");
});
app.get("/register", function(req, res){
    res.render("register");
});
app.get("/secrets", function(req, res){
    // if (req.isAuthenticated()){
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // };
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if(err){
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
});
app.get("/logout", function(req, res){
    req.logout(
        function(err){
            if(!err){
                res.redirect("/");
            } else {
                console.log(err);
            };
        }
    );
});
app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    };
});

//app.post code
app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        };
    });
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save(function(err){
    //         if(!err){
    //             res.render("secrets");
    //         } else {
    //             console.log(err);
    //         };
    //     });
    // });
});
app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.passowrd
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
            // res.redirect("/register");
        } else {
            passport.authenticate("local");
            res.redirect("/secrets");
        }
    });
    // const username = req.body.username;
    // const password = req.body.password;
    // User.findOne({
    //     email: username
    // },
    // function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(err, result){
    //                 if (result === true) {
    //                     res.render("secrets");
    //                 }
    //             });
    //         };
    //     };
    // });
});
app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});
//app.listen code
app.listen(3000, function(){
    console.log("Server started on port 3000");
});