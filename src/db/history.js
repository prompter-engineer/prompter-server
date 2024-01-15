import mongoose from './db.js';

const historySchema = new mongoose.Schema({
  created: {
    type: Date,
    required: true,
    default: Date.now
  },
  updated: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdby: {
    type: String,
    required: true
  },
  systemfingerprint: {
    type: String,
  },
  executiontime: {
    type: Date,
    required: true,
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false
  },
  promptid: {
    type: String,
    required: true,
  },
  prompt: {
    type: {},
    _id: false,
    required: true,
  },
  executions: {
    type: [{}],
    _id: false,
    required: true,
  },
  label: {
    type: Number,
    enum: [0, 1, 2], // 0: no tag, 1: liked, 2: disliked
    default: 0, // Optional: default to 'no tag'
    required: true,
  }
});

const History = mongoose.model('History', historySchema, 'histories');

export default History;