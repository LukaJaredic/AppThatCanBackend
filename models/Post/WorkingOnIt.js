const mongoose = require("mongoose");

var Schema = mongoose.Schema;

const WorkingOnItSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  finishEstimation: {
    type: Date,
    required: true
  },
  reports:[String]
});

module.exports = mongoose.model('WorkingOnIt', WorkingOnItSchema);