const mongoose = require("mongoose");

var Schema = mongoose.Schema;

const commentSchema = new Schema({
  text: { 
    type: String, 
    required: true 
  },
  uploaded: {
    type: Date,
    default: Date.now(),
    required: true
  },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Comment', commentSchema);