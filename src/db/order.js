import mongoose from './db.js';

const orderSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true
  },
  extuserid: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true
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
  paymethod: {
    type: String
  },
  transactionid: {
    type: String
  },
  details: {
    type: Object,
  }
});

const Order = mongoose.model('Order', orderSchema, 'orders');

export default Order;