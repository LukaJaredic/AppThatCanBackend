var express = require("express");
var api = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { secret } = require("../config.json");
const User = require("../models/User/User");
const userService = require("../models/User/UserService");
const Post = require("../models/Post/Post");
const Comment = require("../models/Post/Comment");
const imgUploadController = require("../utils/imgUploadController");
const WorkingOnIt = require("../models/Post/WorkingOnIt");

api.get("/", (req, res) => {
  res.end("test123");
});

api.post("/register", register);
api.post("/login", checkUser, checkPassword, authenticate);
api.get("/getUser", getUser);
api.get("/getUser/:id", getUserByID);
api.post(
  "/posts/new",
  checkJWT,
  imgUploadController.uploadImages,
  imgUploadController.resizeImages,
  newPost
);
api.get("/posts", getPosts);
api.get("/posts/:id", getPost);
api.post("/posts/:postId/comment", checkJWT, comment);
api.post("/posts/editPost/:id", checkJWT, editPost);
api.post("/posts/editComment/:id", checkJWT, editComment);
api.post("/posts/:id/workingOnSolution", checkJWT, isWorkingOnIt, workingOnSolution);
api.post("/posts/:id/addReport", checkJWT, addReport);

api.use((req, res) => {
  res.statusCode = 404;
  res.end("404!");
});

module.exports = api;

async function register(req, res) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let errors = [];

  let user = await User.findOne({ username: req.body.username }).exec();
  if (user) {
    errors.push({ msg: "User with that username already exists" });
  }
  user = await User.findOne({ email: req.body.email }).exec();
  if (user) {
    errors.push({ msg: "User with that email already exists" });
  }
  if (errors.length == 0) {
    let newUser = new User();
    newUser.username = req.body.username;
    newUser.email = req.body.email.toLowerCase();
    const hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    newUser.password = hash;

    await newUser.save(function (err, result) {
      if (err) {
        res.status(400).json(err);
      } else {
        res.status(200).json(result);
      }
    });
  } else {
    res.status(400).json(errors);
  }
}

async function getUser(req, res) {
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id })
    .populate("posts")
    .populate({ path: "work", populate: { path: "post" } })
    .exec();
  if (!tokenUser) {
    res.status(401).json("Unauthorized.");
  } else {
    tokenUser = userService.basicDetails(tokenUser);
    res.status(200).json(tokenUser);
  }
}

async function getUserByID(req, res) {
  let user = await User.findOne({ _id: req.params.id }).populate("posts").populate("work").exec();
  if (!user) {
    res.status(401).json("Unauthorized.");
  } else {
    user = userService.basicDetails(user);
    res.status(200).json(user);
  }
}

async function newPost(req, res) {
  const schema = Joi.object({
    title: Joi.string().required(),
    text: Joi.string().required(),
    attachments: Joi.array(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  const post = new Post();

  post.title = req.body.title;
  post.text = req.body.text;
  post.attachments = req.body.attachments;
  post.author = tokenUser._id;
  post.uploaded = Date.now();
  post.workingOnSolution = [];

  await post.save(async function (err, result) {
    if (err) {
      res.status(400).json(err);
    } else {
      await User.findOneAndUpdate({ _id: tokenUser._id }, { $push: { posts: result } }).exec(
        async function (err2, result2) {
          if (err2) {
            await Post.findOneAndDelete({ _id: result._id }).exec();
            res.status(400).json(err2);
          } else {
            res.status(200).json("New post added.");
          }
        }
      );
    }
  });
}

async function getPosts(req, res) {
  Post.find()
    .populate("comments")
    .populate("author", "username")
    .populate({ path: "workingOnSolution", populate: { path: "author", select: "username" } })
    .exec(function (error, postList) {
      if (error) {
        res.status(400).json(error);
      } else {
        res.status(200).json(postList);
      }
    });
}

async function getPost(req, res) {
  Post.findOneAndUpdate({ _id: req.params.id }, { $inc: { viewNumber: 1 } }).exec();

  Post.findById(req.params.id)
    .populate({ path: "comments", populate: { path: "author", select: "username" } })
    .populate("author", "username")
    .populate({ path: "workingOnSolution", populate: { path: "author", select: "username" } })
    .exec(function (error, post) {
      if (error) {
        res.status(400).json(error);
      } else {
        res.status(200).json(post);
      }
    });
}

async function comment(req, res) {
  const schema = Joi.object({
    text: Joi.string().required(),
    isSolution: Joi.boolean().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  const comment = new Comment();
  comment.text = req.body.text;
  comment.author = tokenUser._id;
  comment.isSolution = req.body.isSolution;
  comment.uploaded = Date.now();

  await comment.save(async function (err, result) {
    if (err) {
      res.status(400).json(err);
    } else {
      await Post.findOneAndUpdate({ _id: req.params.postId }, { $push: { comments: result } }).exec(
        async function (err2, result2) {
          if (err2) {
            await Comment.findOneAndDelete({ _id: result._id }).exec();
            res.status(400).json(err2);
          } else {
            res.status(200).json(result2);
          }
        }
      );
    }
  });
}

async function editPost(req, res) {
  const schema = Joi.object({
    newTitle: Joi.string().required(),
    newText: Joi.string().required(),
    newAttachments: Joi.array(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }

  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();
  console.log(req.body);
  if (!tokenUser.posts.includes(req.params.id)) {
    res.status(403).json("Can't edit other user's posts.");
  } else {
    Post.findOneAndUpdate(
      { _id: req.params.id },
      {
        $set: {
          title: req.body.newTitle,
          text: req.body.newText,
          attachments: req.body.newAttachments,
        },
      }
    ).exec(async function (err, result) {
      if (err) {
        res.status(400).json(err);
      } else {
        res.status(200).json(result);
      }
    });
  }
}

async function editComment(req, res, next) {
  const schema = Joi.object({ newText: Joi.string().required() });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(error);
  }

  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  let comment = await Comment.findOne({ _id: req.params.id }).exec();

  if (comment.author + "" != tokenUser._id + "") {
    res.status(403).json("Can't edit other user's comments.");
  } else {
    Comment.findOneAndUpdate({ _id: req.params.id }, { $set: { text: req.body.newText } }).exec(
      async function (err, result) {
        if (err) {
          res.status(400).json(err);
        } else {
          res.status(200).json(result);
        }
      }
    );
  }
}

async function workingOnSolution(req, res) {
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  let work = new WorkingOnIt(req, res);
  work.author = tokenUser;
  work.finishEstimation = req.body.finishEstimation;
  work.reports[0] = { uploaded: req.body.uploadDate, text: req.body.text };
  await Post.findOne({ _id: req.params.id + "" }).exec(async function (err, result) {
    if (err | (result == null)) {
      res.status(400).json(err);
    } else {
      work.post = result;
      work.save(async function (err, result) {
        if (err | (result == null)) {
          res.status(400).json(err);
        } else {
          await Post.findOneAndUpdate(
            { _id: req.params.id + "" },
            { $addToSet: { workingOnSolution: work } }
          ).exec(async function (err2, result2) {
            if (err | (result2 == null)) {
              await WorkingOnIt.findOneAndDelete({ _id: work.id }).exec();
              res.status(400).json(err2);
            } else {
              await User.findOneAndUpdate(
                { _id: tokenUser._id },
                { $addToSet: { work: work } }
              ).exec(async function (err3, result3) {
                if (err | (result3 == null)) {
                  await Post.findOneAndUpdate(
                    { _id: req.params.id + "" },
                    { $pull: { workingOnSolution: work } }
                  ).exec();
                  await WorkingOnIt.findOneAndDelete({ _id: work.id }).exec();
                  res.status(400).json(err3);
                } else {
                  res.status(200).json(result3);
                }
              });
            }
          });
        }
      });
    }
  });
}

async function addReport(req, res) {
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  let workingOnIt = false;

  await Post.findById(req.params.id)
    .populate("workingOnSolution")
    .exec(async function (err, result) {
      if (err | (result == null)) {
        res.status(400).json("Post does not exist");
      } else {
        for (let i = 0; i < result.workingOnSolution.length; i++) {
          if (result.workingOnSolution[i].author + "" == tokenUser._id + "") {
            workingOnIt = true;
            var work = { uploaded: req.body.uploadDate, text: req.body.text };

            await WorkingOnIt.findOneAndUpdate(
              { _id: result.workingOnSolution[i]._id },
              {
                $push: { reports: work },
                $set: { finishEstimation: req.body.updatedFinishEstimation },
              }
            ).exec(async function (err2, result2) {
              if (err2 | (result2 == null)) {
                res.status(400).json("Error occured");
              } else {
                res.status(200).json(result2);
              }
            });
          }
        }
        if (!workingOnIt) {
          res.status(400).json("User is not working on this problem.");
        }
      }
    });
}

//checks if user is working on this post
async function isWorkingOnIt(req, res, next) {
  let token = req.headers.authorization.split(" ")[1];
  const tokenData = jwt.verify(token, secret);
  let tokenUser = await User.findOne({ _id: tokenData._id }).exec();

  let error = false;

  await Post.findById(req.params.id)
    .populate("workingOnSolution")
    .exec(async function (err, result) {
      if (err | (result == null)) {
        res.status(400).json("Post does not exist");
      } else {
        for (let i = 0; i < result.workingOnSolution.length; i++) {
          if (result.workingOnSolution[i].author + "" == tokenUser._id + "") {
            error = true;
          }
        }
        if (error) {
          res.status(400).json("User is already working on this problem.");
        } else {
          next();
        }
      }
    });
}

//checks if user exists
async function checkUser(req, res, next) {
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
async function checkPassword(req, res, next) {
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
    });
  });
}

//generates JWT from UserService.js
function authenticate(req, res) {
  User.findOne({ email: req.body.email.toLowerCase() }).exec(function (error, user) {
    if (error | !user) {
      res.status(400).json(error);
    } else {
      let jwt = userService.generateJwtToken(user);
      res.status(200).json({ token: jwt });
    }
  });
}

//checks if JWT is valid
async function checkJWT(req, res, next) {
  try {
    let token = req.headers.authorization.split(" ")[1];
    const tokenData = jwt.verify(token, secret);
    let tokenUser = await User.findOne({ _id: tokenData._id }).exec();
    if (!tokenUser) {
      res.status(401).json("Unauthorized.");
    } else {
      next();
    }
  } catch {
    res.status(401).end("Error occured.");
  }
}
