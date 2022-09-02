const mongoose = require("mongoose");

var Schema = mongoose.Schema;

// attachments
const postSchema = new Schema({
  title: { 
    type: String,
    required: true
  },
  text: { 
    type: String, 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  uploaded: {
    type: Date,
    default: Date.now(),
    required: true
  },
  attachments:[String]
});

module.exports = mongoose.model('Post', postSchema);