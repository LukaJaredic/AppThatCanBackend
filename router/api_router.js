var express = require("express");
var api = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { secret } = require('../config.json');
const User = require("../models/User/User");
const userService = require('../models/User/UserService');
const Post = require('../models/Post/Post');
const Comment = require('../models/Post/Comment');

api.get('/',(req,res)=>{
    res.end('test123');
  })

api.post('/register', register);
api.post('/login', checkUser, checkPassword, authenticate);
api.get('/getUser', getUser);
api.get('/getUser/:id', getUserByID);
api.post('/posts/new', checkJWT, newPost);
api.get('/posts', getPosts);
api.get('/posts/:id', getPost);
api.post('/posts/:postId/comment', checkJWT, comment);
api.post('/posts/editPost/:id', checkJWT, editPost);
api.post('/posts/editComment/:id', checkJWT, editComment);
api.post('/posts/:id/workingOnSolution', checkJWT, workingOnSolution);
api.post('/posts/:id/quitWorkingOnSolution', checkJWT, quitWorkingOnSolution);


api.use((req, res) => {
    res.statusCode = 404;
    res.end("404!");
  });
  
module.exports = api;

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

async function getUser(req,res) {
  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).populate('posts').exec();
  
    if(!tokenUser){
    res.status(401).json("Unauthorized.");
  } else{
    tokenUser = userService.basicDetails(tokenUser);
    res.status(200).json(tokenUser);
  }
}

async function getUserByID(req,res) {
  
  let user = await User.findOne({_id : req.params.id}).populate('posts').exec();
  if(!user){
    res.status(401).json("Unauthorized.");
  } else{
    user = userService.basicDetails(user);
    res.status(200).json(user);
  }
}

async function newPost(req, res) {
  const schema = Joi.object({ title : Joi.string().required(), text : Joi.string().required(), attachments: Joi.array()});
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();

  const post = new Post();

  post.title = req.body.title;
  post.text = req.body.text;
  post.attachments = req.body.attachments;
  post.author = tokenUser._id;
  post.workingOnSolution = [];

  await post.save(async function(err,result){
    if (err){
        res.status(400).json(err)
    }
    else{
      await User.findOneAndUpdate({_id : tokenUser._id},{$push: {posts: result}}).exec(async function(err2,result2){
        if(err2){
          await Post.findOneAndDelete({_id : result._id}).exec();
          res.status(400).json(err2);
        } else {
          res.status(200).json(result2);
        }
      });
    }
});
}

async function getPosts(req,res){
  Post.find().populate('comments').populate('author','username').populate('workingOnSolution','username').exec(function (error, postList) {
    if (error) {
      res.status(400).json(error);
    } else {
        res.status(200).json(postList);
      }
  })
};

async function getPost(req,res){
  Post.findOneAndUpdate({_id : req.params.id},{$inc : {viewNumber : 1}}).exec();

  Post.findById(req.params.id).populate('comments').populate('author','username').populate('workingOnSolution','username').exec(function (error, post) {
    if (error) {
      res.status(400).json(error);
    } else {
        res.status(200).json(post);

      }
  })
};

async function comment(req,res){
  const schema = Joi.object({ text : Joi.string().required(), isSolution : Joi.boolean().required() });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();

  const comment = new Comment();
  comment.text = req.body.text;
  comment.author = tokenUser._id;
  comment.isSolution = req.body.isSolution;

  await comment.save(async function(err,result){
    if (err){
        res.status(400).json(err);
    }
    else{
      await Post.findOneAndUpdate({_id : req.params.postId},{$push: {comments: result}}).exec(async function(err2,result2){
        if(err2){
          await Comment.findOneAndDelete({_id : result._id}).exec();
          res.status(400).json(err2);
        } else {
          res.status(200).json(result2);
        }
      });
    }
});
}

async function editPost(req,res){
  const schema = Joi.object({ newTitle : Joi.string().required(), newText : Joi.string().required(), newAttachments: Joi.array()});
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }

  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();
  
  if(!tokenUser.posts.includes(req.params.id)){
    res.status(403).json("Can't edit other user's posts.")
  } else{
     Post.findOneAndUpdate({_id : req.params.id},{$set : {title : req.body.newTitle, text : req.body.newText, attachments : req.body.newAttachments}}).exec(async function(err,result){
    if(err){
      res.status(400).json(err);
    } else {
      res.status(200).json(result);
    }
  });
  }
}

async function editComment(req,res){
  const schema = Joi.object({ newText : Joi.string().required() });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }

  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();

  let comment = await Comment.findOne({_id : req.params.id}).exec();

  if(comment.author+"" != tokenUser._id+"" ){
    res.status(403).json("Can't edit other user's comments.")
  } else{
     Comment.findOneAndUpdate({_id : req.params.id},{$set : {text : req.body.newText}}).exec(async function(err,result){
    if(err){
      res.status(400).json(err);
    } else {
      res.status(200).json(result);
    }
  });
  }
}

async function workingOnSolution(req,res){
  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();

  Post.findOneAndUpdate({_id : req.params.id},{$addToSet: {workingOnSolution: tokenUser}}).exec(async function(err,result){
    if(err){
      res.status(400).json(err);
    } else {
      res.status(200).json(result);
    }
  });
}

async function quitWorkingOnSolution(req,res){
  let token = req.headers.authorization.split(" ")[1];    
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({_id : tokenData._id}).exec();

  Post.findOneAndUpdate({_id : req.params.id},{$pull: {workingOnSolution: tokenUser._id}}).exec(async function(err,result){
    if(err){
      res.status(400).json(err);
    } else {
      res.status(200).json(result);
    }
  });
}


//checks if user exists
async function checkUser(req,res,next){
    User.findOne({ email: req.body.email.toLowerCase() }).exec(function (error, user) {
      if (error) {
        res.status(400).json(error);
      } else if (!user) {
        res.status(404).json("User does not exist.");
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
        let jwt = userService.generateJwtToken(user);
        res.status(200).json({token:jwt});
    }
  })
}

//checks if JWT is valid
async function checkJWT(req,res,next){
  try{
    let token = req.headers.authorization.split(" ")[1];  
    const tokenData = jwt.verify(token, secret);
    let tokenUser = await User.findOne({_id : tokenData._id}).exec();
    if(!tokenUser){
      res.status(401).json("Unauthorized.");
    } else{
      next();
    }
  }
  catch{
    res.status(401).end("Error occured.");
  }
}