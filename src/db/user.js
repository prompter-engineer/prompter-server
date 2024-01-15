import mongoose from './db.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  },
  expired: {
    type: Date
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false
  },
  googleid: {
    type: String
  },
  membership: {
    type: String,
    required: true,
    enum: ['basic', 'plus'],
    default: 'basic'
  },
  stripecid: {
    type: String
  },
  openaisettings: {
    apikey: {
      type: String
    },
    iscustom: {
      type: Boolean
    },
    customendpoint: {
      type: String
    },
  }
});

const User = mongoose.model('User', userSchema, 'users');

export default User;