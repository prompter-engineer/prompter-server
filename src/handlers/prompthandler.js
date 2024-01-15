import Prompt from '../db/prompt.js';
import Suite from '../db/suite.js';

function toDTO(document){
  const dto = {
    id: document._id.toString(),
    name: document.name,
    created: document.created,
    updated: document.updated,
    createdBy: document.createdby,
    suiteId: document.suiteid,
    deleted: document.deleted,
    parameters: document.parameters,
    messages: document.messages,
    variables: document.variables,
    functions: document.functions,
    toolChoice: document.toolchoice,
    batchConfigs: document.batchconfigs,
  };
  return dto;
}

async function getAllPromptsBySuiteId(req, res, next) {
  let { suiteId } = req.query;
  const user = req.user;

  if (!suiteId || suiteId.trim() === '') {
    return res.sendResponse(null, 3007);
  }

  try {
    suiteId = suiteId.trim();
    const suite = await Suite.findById(suiteId).where({ deleted: false });
    if (!suite || suite.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3008);
    }

    const prompts = await Prompt.find({ createdby: user._id, suiteid: suiteId.trim(), deleted: false }).sort({ created: 1 });
    return res.sendResponse(prompts.map(prompt => toDTO(prompt)));
  } catch (error) {
    console.error(`[ERR] failed to get prompts. user: ${JSON.stringify(user)}` + error.stack);
    return res.sendResponse(null, 3007);
  }
}

async function createPrompt(req, res, next) {
  let { name, suiteId } = req.body;
  const user = req.user;

  try {
    if (!suiteId || suiteId.trim() === '') {
      console.error(`[ERR] create prompt failed. empty suiteid.`);
      return res.sendResponse(null, 3009);
    }
  
    suiteId = suiteId.trim();
    const suite = await Suite.findById(suiteId).where({ deleted: false });
    if (!suite || suite.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3010);
    }
    
    let newPrompt;
    if (!name || name.trim() === '') {
      // use default name
      newPrompt = new Prompt({createdby: user._id.toString(), suiteid: suiteId});
    } else {
      newPrompt = new Prompt({ name, createdby: user._id.toString(), suiteid: suiteId });
    }

    const createdPrompt = await newPrompt.save();
    return res.sendResponse(toDTO(createdPrompt));
  } catch (error) {
    console.error(`[ERR] failed to create prompt.` + error.stack);
    return res.sendResponse(null, 3009);
  }
}

async function duplicatePrompt(req, res, next) {
  let { promptId } = req.body;
  const user = req.user;

  try {
    if (!promptId || promptId.trim() === '') {
      console.error(`[ERR] duplicate prompt failed. Empty prompt ID.`);
      return res.sendResponse(null, 3011);
    }
  
    promptId = promptId.trim();
    const sourcePrompt = await Prompt.findById(promptId).where({ deleted: false });
    if (!sourcePrompt || sourcePrompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3010);
    }

    const destPrompt = {
      name: sourcePrompt.name + "_Duplicate",
      createdby: user._id.toString(),
      suiteid: sourcePrompt.suiteid,
      parameters: sourcePrompt.parameters,
      messages: sourcePrompt.messages,
      variables: sourcePrompt.variables,
      functions: sourcePrompt.functions,
      toolchoice: sourcePrompt.toolchoice,
      batchconfigs: sourcePrompt.batchconfigs,
    }
    
    const newPrompt = new Prompt(destPrompt);
    const duplicatedPrompt = await newPrompt.save();
    return res.sendResponse(toDTO(duplicatedPrompt));
  } catch (error) {
    console.error(`[ERR] failed to create prompt.` + error.stack);
    return res.sendResponse(null, 3011);
  }
}

async function verifyPromptLimit(req, res, next) {
  const user = req.user;
  
  // check exipre is later than now, membership is 'plus'
  if(user.membership === 'basic') {
    try{
      const suites = await Suite.find({ deleted: false, createdby: user._id.toString() })
      .sort({ created: -1 });
  
      if (suites.length > 0) {
        const suiteIds = suites.map(suite => suite._id);
  
        // Query and Sort Prompts in Retrieved Suites Created by the User
        const prompts = await Prompt.find({
        suiteid: { $in: suiteIds },
        deleted: false,
        createdby: user._id.toString(),
        }).sort({ updated: -1 });
  
        // Determine the Latest Valid Prompt
        if (prompts.length >= 3) {
          return res.sendResponse(null, 1201);
        }
      }
    } catch(error) {
      console.error('Error verifying prompt limit:', error);
      return res.sendResponse(null, 400);
    }
  }

  next();
}

async function renamePrompt(req, res, next) {
  let { name, id } = req.body;
  const user = req.user;
  const now = new Date();

  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3014);
  }

  if (!name || name.trim() === '') {
    return res.sendResponse(null, 3014);
  }

  try {
    const promptId = id.trim();
    const prompt = await Prompt.findById(promptId).where({ deleted: false });
    if (!prompt || prompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3015);
    }

    if (prompt.name === name.trim()){
      // no need to update
      return res.sendResponse(toDTO(prompt));
    }

    const updatedPrompt = await Prompt.findByIdAndUpdate(
      promptId,
      { name: name.trim(), updated: now },
      { new: true }
    );

    return res.sendResponse(toDTO(updatedPrompt));
  } catch (error) {
    console.error(`[ERR] failed to rename prompt.` + error.stack);
    return res.sendResponse(null, 3014);
  }
}

function validateParams(params) {
  //TODO: validate parameters when edit prompt
  return true;
}

async function editPrompt(req, res, next) {
  let { id, name, suiteId, parameters, messages, variables, functions, toolChoice: toolchoice, batchConfigs: batchconfigs } = req.body;
  const user = req.user;
  const now = new Date();

  // input validation
  if (!id || id.trim() === '' 
  || !name || name.trim() === ''
  || !suiteId || suiteId.trim() === ''
  || !validateParams(parameters)
  ) {
    return res.sendResponse(null, 3014);
  }
  
  try {
    const promptId = id.trim();
    const prompt = await Prompt.findById(promptId).where({ deleted: false, suiteid: suiteId.trim(), createdby: user._id.toString() });
    if (!prompt) {
      return res.sendResponse(null, 3015);
    }

    const updateParams = {
      name: name.trim(),
      parameters,
      messages,
      variables: variables && variables.length > 0 ? variables : [],
      functions: functions && functions.length > 0 ? functions : [],
      toolchoice: toolchoice?toolchoice:null,
      batchconfigs: batchconfigs && batchconfigs.length > 0 ? batchconfigs : [],
      updated: now,
    };

    const updatedPrompt = await Prompt.findByIdAndUpdate(
      promptId,
      updateParams,
      { new: true }
    );

    return res.sendResponse(toDTO(updatedPrompt));
  } catch (error) {
    console.error(`[ERR] failed to update prompt.` + error.stack);
    return res.sendResponse(null, 3014);
  }
}

async function removePrompt(req, res, next) {
  let { id } = req.body;
  const user = req.user;
  const now = new Date();

  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3012);
  }

  try {
    const promptId = id.trim();
    const prompt = await Prompt.findById(promptId);
    if (!prompt || prompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3006);
    }

    // return directly if already deleted
    if (prompt.deleted) {
      return res.sendResponse();
    }

    // set $deleted to true, logic deletion
    await Prompt.findByIdAndUpdate(
      promptId,
      { 
        updated: now,
        deleted: true
      },
      { new: true }
    );

    return res.sendResponse();
  } catch (error) {
    console.error(`[ERR] failed to remove prompt.` + error.stack);
    return res.sendResponse(null, 3012);
  }
}

async function getPrompt(req, res, next) {
  let { id } = req.query;
  const user = req.user;

  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3013);
  }

  try {
    const promptId = id.trim();
    const prompt = await Prompt.findById(promptId).where({ deleted: false });
    if (!prompt || prompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3008);
    }
    const resp = toDTO(prompt);

    const suite = await Suite.findById(prompt.suiteid);
    resp.suiteName = suite.name;

    return res.sendResponse(resp);
  } catch (error) {
    console.error(`[ERR] failed to get prompt.` + error.stack);
    return res.sendResponse(null, 3013);
  }
}

export { getAllPromptsBySuiteId, createPrompt, duplicatePrompt, verifyPromptLimit, renamePrompt, editPrompt, removePrompt, getPrompt };