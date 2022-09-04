const mongoose = require("mongoose");

var Schema = mongoose.Schema;

const postSchema = new Schema({
  title: { 
    type: String,
    required: true
  },
  text: { 
    type: String, 
    required: true 
  },
  uploaded: {
    type: Date,
    default: Date.now(),
    required: true
  },
  viewNumber:{
    type: Number,
    default: 0,
    required: true
  },
  attachments:[String],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  workingOnSolution: [{ type: Schema.Types.ObjectId, ref: 'WorkingOnIt' }]
});

module.exports = mongoose.model('Post', postSchema);