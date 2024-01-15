import mongoose from './db.js';

const promptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Untitled'
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
  suiteid: {
    type: String,
    required: true
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false
  },
  parameters: {
    type: Object,
    required: true,
    default: {
      "model": "gpt-3.5-turbo",
      "temperature": 1,
      "topP": 1,
      "n": 1,
      "maxTokens": 0,
      "frequencyPenalty": 0,
      "presencePenalty": 0
    }
  },
  messages: {
    type: [{
      _id: false,
      role: { type: String, required: true },
      content: { type: String, default: "" }
    }],
    required: true,
    default: [
      { role: "system", content: "" },
      { role: "user", content: "" }
    ]
  },
  variables: {
    type: [{}],
    _id: false,
  },
  functions: {
    type: [{}],
    _id: false,
  },
  toolchoice: { 
    type: String,
  },
  batchconfigs: {
    type: [{}],
    _id: false,
  },
},
{ minimize: false }
);

const Prompt = mongoose.model('Prompt', promptSchema, 'prompts');

export default Prompt;