import Suite from '../db/suite.js';
import Prompt from '../db/prompt.js';

function toDTO(document){
  const dto = {
    id: document._id.toString(),
    name: document.name,
    created: document.created,
    updated: document.updated,
    createdBy: document.createdby,
    deleted: document.deleted,
  };
  return dto;
}

async function getAllSuites(req, res, next) {
  const user = req.user;
  try {
    const suites = await Suite.find({ createdby: user._id, deleted: false }).sort({ created: 1 });
    return res.sendResponse(suites.map(suite=>toDTO(suite)));
  } catch (error) {
    console.error(`[ERR] get all suites. user: ${JSON.stringify(user)}` + error.stack);
    return res.sendResponse(null, 400);
  }
}

async function createSuite(req, res, next) {
  const user = req.user;
  let { name } = req.body;

  if (!name || name.trim() === '') {
    name = 'New_Project';
  }

  try {
    const newSuite = new Suite({createdby: user._id.toString(), name: name.trim()});
    const createdSuite = await newSuite.save();
    return res.sendResponse(toDTO(createdSuite));
  } catch (error) {
    console.error(`[ERR] failed to create suite.` + error.stack);
    return res.sendResponse(null, 3001);
  }
}

async function editSuite(req, res, next) {
  let { name, id } = req.body;
  const user = req.user;
  const now = new Date();
  
  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3003);
  }

  if (!name || name.trim() === '') {
    return res.sendResponse(null, 3002);
  }

  try {
    const suiteId = id.trim();
    const suite = await Suite.findById(suiteId).where({ deleted: false });;
    if (!suite || suite.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3004);
    }

    const updatedSuite = await Suite.findByIdAndUpdate(
      suiteId,
      { 
        name: name.trim(), 
        updated: now,
      },
      { new: true }
    );

    return res.sendResponse(toDTO(updatedSuite));
  } catch (error) {
    console.error(`[ERR] failed to update suite.` + error.stack);
    return res.sendResponse(null, 3001);
  }
}

async function removeSuite(req, res, next) {
  let { id } = req.body;
  const user = req.user;
  const now = new Date();

  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3005);
  }

  try {
    const suiteId = id.trim();
    const suite = await Suite.findById(suiteId);
    if (!suite || suite.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3006);
    }

    // return directly if already deleted
    if (suite.deleted) {
      return res.sendResponse();
    }

    // set $deleted to true, logic deletion
    await Suite.findByIdAndUpdate(
      suiteId,
      { 
        updated: now,
        deleted: true
      },
      { new: true }
    );

    // remove all prompts within this suite
    await Prompt.updateMany({
      suiteid: suiteId,
      createdby: user._id.toString(),
      deleted: false,
    }, 
    {
      deleted: true
    });
    
    return res.sendResponse();
  } catch (error) {
    console.error(`[ERR] failed to remove suite.` + error.stack);
    return res.sendResponse(null, 3005);
  }
}

export { getAllSuites, createSuite, editSuite, removeSuite };