var express = require("express");
var api = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { secret } = require('../config.json');
const User = require("../models/User/User");
const userService = require('../models/User/UserService');

require("dotenv").config();

api.get('/',(req,res)=>{
    res.end('test123');
  })

api.post('/register', register);
api.get('/login', checkUser, checkPassword, authenticate);
api.get('/getUser', getUser);


api.use((req, res) => {
    res.statusCode = 404;
    res.end("404!");
  });
  
module.exports = api;

async function getUser(req,res) {
    let token = req.headers.authorization.split(" ")[1];    
    const tokenData = jwt.verify(token, secret);
    let tokenUser = await User.findOne({_id : tokenData._id}).exec();
    if(!tokenUser){
      res.status(401).json("Unauthorized.");
    } else{
      tokenUser = userService.basicDetails(tokenUser);
        res.status(200).json(tokenUser);
    }
}

async function register(req, res) {
  const schema = Joi.object({ email : Joi.string().email().required(), username : Joi.string().required(), password : Joi.string().required() });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let errors = [];

  let user = await User.findOne({ username: req.body.username }).exec();
  if(user){
    errors.push({msg: 'User with that username already exists'});
}
  user = await User.findOne({ email: req.body.email }).exec();
  if (user){
    errors.push({msg: 'User with that email already exists'});
    } 
    if(errors.length==0){
        let newUser = new User();
        newUser.username = req.body.username;
        newUser.email = req.body.email.toLowerCase();
        const hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));    
        newUser.password = hash;
        
        await newUser.save(function(err,result){
            if (err){
                res.status(400).json(err)
            }
            else{
                res.status(200).json(result);
            }
        });
    } else {
        res.status(400).json(errors)
    }     
} 

//checks if user exists
async function checkUser(req,res,next){
    User.findOne({ email: req.body.email.toLowerCase() }).exec(function (error, user) {
      if (error) {
        res.status(400).json(error);
      } else if (!user) {
        res.status(404).json("User does not exist.");
        console.log("User does not exist.");
      } else {
          next();
        }
    });
  }
  
//checks if password is correct
async function checkPassword(req,res,next){
    User.findOne({ email: req.body.email.toLowerCase() }).exec(function (error, user) {
        if (error) {
          res.status(400).json(error);
        }   
        user.comparePassword(req.body.password, async function (matchError, isMatch) {
          if (matchError) {
            res.status(400).json(matchError);
          } else if (!isMatch) {
            res.status(403).end("Passwords do not match.");
          } else {
            next();
          }
        })
      }
    );
  }

//generates JWT from UserService.js
function authenticate(req, res) {
  User.findOne({email : req.body.email.toLowerCase()}).exec(function (error, user) {
    if (error | !user) {
      res.status(400).json(error);
    } else {
        console.log(user);
        let jwt = userService.generateJwtToken(user);
        res.status(200).json(jwt);
    }
  })
}