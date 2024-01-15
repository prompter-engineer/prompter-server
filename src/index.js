import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import { login, sendOtp, verifyToken, getUserInfo, updateUserInfo, authGoogle, getUserSettings, updateUserSettings } from './handlers/userhandler.js';
import { createStripeOrder, createManagePortal, receivedStripeWebhook } from './handlers/orderhandler.js';
import { getAllSuites, createSuite, editSuite, removeSuite } from './handlers/suitehandler.js';
import { getAllPromptsBySuiteId, createPrompt, duplicatePrompt, verifyPromptLimit, editPrompt, renamePrompt, removePrompt, getPrompt } from './handlers/prompthandler.js';
import { addHistory, removeAllHistory, labelHistory, getAllHistory } from './handlers/historyhandler.js';
import corsHeaders from './config/corsheaders.js';
import setResponse from './util/response.js';

dotenv.config();

const port = parseInt(process.env.PORT || '8080', 10);
const appBaseURL = process.env.APP_BASE_URL;

const app = express();
app.disable('etag');
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (req.originalUrl === '/v1/webhook/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({
  extended: true
}));

// configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [`https://${appBaseURL}`];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Allow all origins in development mode
      callback(null, true);
    }
  }
};

app.use(cors(corsOptions));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).set(corsHeaders).type('text/plain').send(err.message);
  }
  next();
});

app.use(setResponse);

const handleOptions = (req, res) => {
  res.setHeader('Access-Control-Max-Age', '1728000').set(corsHeaders).sendStatus(204);
};

const handleOptionsInstant = (req, res) => {
  res.set(corsHeaders).sendStatus(204);
};

app.options('/v1/user/verifytoken', handleOptionsInstant);
app.get('/v1/user/verifytoken', verifyToken, (req, res) => {
  return res.sendResponse();
} );

app.options('/v1/user/sendOtp', handleOptions);
app.post('/v1/user/sendOtp', sendOtp);

app.options('/v1/user/login/email', handleOptionsInstant);
app.post('/v1/user/login/email', login);

app.options('/v1/user/login/google', handleOptionsInstant);
app.post('/v1/user/login/google', authGoogle);

app.options('/v1/user/me', handleOptionsInstant);
app.get('/v1/user/me', verifyToken, getUserInfo);
app.post('/v1/user/me', verifyToken, updateUserInfo);

app.options('/v1/order/stripe/pay', handleOptionsInstant);
app.post('/v1/order/stripe/pay', verifyToken, createStripeOrder);

app.options('/v1/order/stripe/manage', handleOptionsInstant);
app.get('/v1/order/stripe/manage', verifyToken, createManagePortal);

app.post('/v1/webhook/stripe',express.raw({type: 'application/json'}), receivedStripeWebhook);

app.options('/v1/settings/api', handleOptionsInstant);
app.get('/v1/settings/api', verifyToken, getUserSettings);
app.post('/v1/settings/api', verifyToken, updateUserSettings);

app.options('/v1/suite/list', handleOptionsInstant);
app.get('/v1/suite/list', verifyToken, getAllSuites);

app.options('/v1/suite/create', handleOptionsInstant);
app.post('/v1/suite/create', verifyToken, createSuite);

app.options('/v1/suite/update', handleOptionsInstant);
app.post('/v1/suite/update', verifyToken, editSuite);

app.options('/v1/suite/remove', handleOptionsInstant);
app.post('/v1/suite/remove', verifyToken, removeSuite);

app.options('/v1/prompt/list', handleOptionsInstant);
app.get('/v1/prompt/list', verifyToken, getAllPromptsBySuiteId);

app.options('/v1/prompt/create', handleOptionsInstant);
app.post('/v1/prompt/create', verifyToken, verifyPromptLimit, createPrompt);

app.options('/v1/prompt/duplicate', handleOptionsInstant);
app.post('/v1/prompt/duplicate', verifyToken, verifyPromptLimit, duplicatePrompt);

app.options('/v1/prompt/sync', handleOptionsInstant);
app.post('/v1/prompt/sync', verifyToken, editPrompt);

app.options('/v1/prompt/rename', handleOptionsInstant);
app.post('/v1/prompt/rename', verifyToken, renamePrompt);

app.options('/v1/prompt/remove', handleOptionsInstant);
app.post('/v1/prompt/remove', verifyToken, removePrompt);

app.options('/v1/prompt/get', handleOptionsInstant);
app.get('/v1/prompt/get', verifyToken, getPrompt);

app.options('/v1/history/add', handleOptionsInstant);
app.post('/v1/history/add', verifyToken, addHistory);

app.options('/v1/history/label', handleOptionsInstant);
app.post('/v1/history/label', verifyToken, labelHistory);

app.options('/v1/history/removeall', handleOptionsInstant);
app.post('/v1/history/removeall', verifyToken, removeAllHistory);

app.options('/v1/history/list', handleOptionsInstant);
app.post('/v1/history/list', verifyToken, getAllHistory);

app.use('*', (req, res) => {
  res.status(404).set(corsHeaders).type('text/plain').send('Not found');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
