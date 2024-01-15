import mongoose from './db.js';

const suiteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'New_Project'
  },
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
  deleted: {
    type: Boolean,
    required: true,
    default: false
  }
});

const Suite = mongoose.model('Suite', suiteSchema, 'suites');

export default Suite;