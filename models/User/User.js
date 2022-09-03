const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
});

userSchema.methods.comparePassword = function(password, callback) {
    bcrypt.compare(password, this.password, function(error, isMatch) {
      if (error) {
        return callback(error);
      } else {
        return callback(null, isMatch);
      }
    })
  }

module.exports = mongoose.model("User", userSchema);
