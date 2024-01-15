import NodeCache from 'node-cache';
import jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid'
import { OAuth2Client } from 'google-auth-library';

import { sendLoginOTP } from '../util/sesClient.js';
import User from '../db/user.js';
import Suite from '../db/suite.js';
import Prompt from '../db/prompt.js';

import * as dotenv from 'dotenv';
dotenv.config();

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  'postmessage',
);

const otps = new NodeCache({ stdTTL: 120 }); // Set the TTL to 2 minutes (120 seconds)
const nanoid = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 6);

async function login(req, res){
  let { email, otp } = req.body;

  try {
    email = email.trim().toLowerCase();

    // Verify the OTP code here
    const storedOtp = otps.get(email);
    console.log(`email: ${email}, otp: ${otp}, storedOtp: ${storedOtp}`)

    if (!storedOtp || storedOtp !== otp) {
      return res.sendResponse(null, 1001);
    }

    otps.del(email); // Delete the OTP from cache after successful verification
    const userInfo = await newUserCreate(email, null, null, null);

    if (!userInfo) {
      return res.sendResponse(null, 1002);
    }

    return res.sendResponse(userInfo);
  } catch (error) {
    console.error(error);
    return res.sendResponse(null, 1002);
  }
}

async function newUserCreate(email, name, sub, picture) {
  try {
    let user = await User.findOne({ email });

    // new user register
    if (!user) {
      user = new User({
        email: email,
        name: name?name:email,
        googleid: sub?sub:undefined,
        avatar: picture?picture:undefined
      });
  
      user = await user.save();

      if (user) {
        const newPromptId = await createSuiteAndPrompt(user._id.toString());

        if(!newPromptId) {
          return res.sendResponse(null, 1002);
        }

        user.latestPromptId = newPromptId;
        user.newcomer = true;
      }
  
      console.log(`usercreate: [${user.email}][${user._id}]`);
    }

    if (!user.latestPromptId) {
      let latestPromptId = await getLatestPromptId(user._id.toString());

      if (!latestPromptId) {
        return res.sendResponse(null, 1002);
      }

      user.latestPromptId = latestPromptId;
    }
  
    const token = jwt.sign({ userid: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
    const userInfo = convertUserInfo(user);
    userInfo.token = token;
    return userInfo;
  } catch(error) {
    console.error(error);
    return res.sendResponse(null, 1002);
  }
}

const createSuiteAndPrompt = async(userId) => {
  try {
    const newSuite = new Suite({createdby: userId});
    const createdSuite = await newSuite.save();
  
    if (createdSuite) {
      const newPrompt = new Prompt({
        createdby: userId,
        suiteid: createdSuite._id.toString(),
      });
      const createdPrompt = await newPrompt.save();
  
      if (createdPrompt) {
        return createdPrompt._id.toString();
      }
    }
    return null;
  } catch(error) {
    console.error(`createSuiteAndPrompt error ` + error);
    return null;
  }
}

const getLatestPromptId = async (userId) => {
  try {
    const suites = await Suite.find({ deleted: false, createdby: userId })
                             .sort({ created: -1 });

    if (suites.length > 0) {
      const suiteIds = suites.map(suite => suite._id);

      // Query and Sort Prompts in Retrieved Suites Created by the User
      const prompts = await Prompt.find({
        suiteid: { $in: suiteIds },
        deleted: false,
        createdby: userId
      }).sort({ updated: -1 });

      // Determine the Latest Valid Prompt
      if (prompts.length > 0) {
        return prompts[0]._id.toString(); // First prompt is the latest
      }

      // Create New Prompt in the Latest Valid Suite
      return await createPrompt(suites[0]._id.toString(), userId);
    }

    // Create New Suite and Prompt if No Valid Suite Exists
    return await createSuiteAndPrompt(userId);

  } catch (error) {
    console.error('Error in getLatestPromptId by userId ${userId} :', error);
    return null;
  }
};

const createPrompt = async (suiteId, userId) => {
  try {
    const newPrompt = new Prompt({
      suiteid: suiteId,
      createdby: userId
    });
    const createdPrompt = await newPrompt.save();

    if (createdPrompt) {
      return createdPrompt._id.toString();
    }
    return null;
  } catch (error) {
    console.error(`Error in createPrompt. suiteId: ${suiteId}, userId:${userId} `, error);
    return null;
  }
};

function convertUserInfo(user) {
  const userInfo = {};
  let now = new Date();

  userInfo.name = user.name;
  userInfo.email = user.email;
  userInfo.id = user._id;
  userInfo.openaiSettings = {
    apiKey: user.openaisettings.apikey,
    isCustom: user.openaisettings.iscustom,
    customEndpoint: user.openaisettings.customendpoint,
  };
  userInfo.latestPromptId = user.latestPromptId;
  userInfo.newcomer = user.newcomer ? user.newcomer:false;

  if ((user?.expired) && (now.getTime() > user?.expired.getTime())) {
    userInfo.membership = 'basic';
  } else {
    userInfo.membership = user.membership;
  }

  return userInfo;
}

async function sendOtp(req, res) {
  let { email } = req.body;

  let otp;
  if (process.env.NODE_ENV === 'production') {
    // Send real email verification code
    otp = nanoid();
    console.log(`Verification code sending: ${email} ${otp}`);

    try {
      email = email.trim().toLowerCase();
      await sendLoginOTP(email, otp);
      otps.set(email, otp.toString()); // Store the OTP in node-cache
      return res.sendResponse();
    } catch (error) {
      console.error(error);
      return req.sendResponse(null, 1003);
    }
  } else {
    // Use fixed code in development environment
    otp = '888888';
    otps.set(email, otp.toString()); // Store the OTP in node-cache
    return res.sendResponse();
  }
}

async function verifyToken(req, res, next) {
  const token = req.headers['x-prompter-token'];
  if (!token) {
    return res.sendResponse(null, 1004);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userid);

    if (!user || user.deleted) {
      console.error(`User not found or user has been deleted. userid: ${decoded.userid}`)
      return res.sendResponse(null, 1005);
    }

    req.userid = decoded.userid;
    
    let now = new Date();
    if ((user?.expired) && (now.getTime() > user?.expired.getTime())) {
      user.membership = 'basic';
    } else {
      user.membership = user.membership;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`jwt verify failed. headers: ${JSON.stringify(req.headers)}, error: ${error.message}`);
    return res.sendResponse(null, 1005);
  }
};

async function getUserInfo(req, res, next) {
  const user = req.user;

  try {
    const userInfo = convertUserInfo(user);
    return res.sendResponse(userInfo);
  } catch(e) {
    console.error(`[ERR] get user info error. user: ${JSON.stringify(user)}` + e.stack);
    return res.sendResponse(null, 400);
  }
};

async function updateUserInfo(req, res, next) {
  const user = req.user;
  const { name } = req.body;

  let now = new Date();
  try {
    await User.updateOne({ _id: user?._id }, {name: name.trim(), updated: now});

    return res.sendResponse();
  } catch(e) {
    console.error(`[ERR] update user info error. user: ${JSON.stringify(user)}` + e.stack);
    return res.sendResponse(null, 400);
  }
};

async function getUserSettings(req, res, next) {
  const user = req.user;

  try {
    return res.sendResponse(user?.openaisettings);
  } catch(e) {
    console.error(`[ERR] get user settings error. user: ${JSON.stringify(user)}` + e.stack);
    return res.sendResponse(null, 400);
  }
};

async function updateUserSettings(req, res, next) {
  const user = req.user;
  const { openaiSettings: {apiKey: apikey, isCustom: iscustom, customEndpoint: customendpoint } } = req.body;

  let now = new Date();
  try {
    if (iscustom && !(typeof iscustom === 'boolean')) {
      return res.sendResponse(null, 1102);
    }

    if (iscustom && (!customendpoint || customendpoint.trim()==='')) {
      return res.sendResponse(null, 1103);
    }

    await User.updateOne({ _id: user?._id }, {
      openaisettings: {
        apikey: apikey.trim(),
        iscustom: iscustom,
        customendpoint: customendpoint ? customendpoint.trim() : null,
      }, 
      updated: now,
    });
    return res.sendResponse();
  } catch(e) {
    console.error(`[ERR] update user settings error. user: ${JSON.stringify(user)}` + e.stack);
    return res.sendResponse(null, 400);
  }
};

async function insertStripeCustomerId(uid, stripecid) {
  if (uid&&stripecid) {
    let now = new Date();
    
    try {
      await User.updateOne({ _id: uid }, {stripecid, updated: now});
    } catch(e) {
      console.error(`[ERR] insertStripeCustomerId error. uid: ${uid}, stripecid: ${stripecid}\n` + e.stack);
    }
  }
};

async function authGoogle(req, res, next) {
  const { code } = req.body;

  try {
    const { tokens } = await oAuth2Client.getToken(code); // exchange code for tokens
    // console.log(tokens);
    
    const login = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });

    const email = login?.payload.email;
    const name = login?.payload.name;
    const sub = login?.payload.sub;
    const picture = login?.payload.picture;

    const userInfo = await newUserCreate(email, name, sub, picture);
  
    return res.sendResponse(userInfo);
  } catch (e) {
    console.error(e);
    return res.sendResponse(null, 1006);
  } 
}

export {
  login,
  sendOtp,
  verifyToken,
  getUserInfo,
  updateUserInfo,
  authGoogle,
  insertStripeCustomerId,
  getUserSettings,
  updateUserSettings,
};