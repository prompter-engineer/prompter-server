import History from '../db/history.js';
import Prompt from '../db/prompt.js';

function toDTO(document){
  const dto = {
    id: document._id.toString(),
    created: document.created,
    updated: document.updated,
    createdBy: document.createdby,
    executionTime: document.executiontime,
    systemFingerprint: document.systemfingerprint,
    promptId: document.promptid,
    config: document.prompt,
    executions: document.executions,
    label: document.label,
  };
  return dto;
}

async function addHistory(req, res, next) {
  let { promptId, history } = req.body;
  let { executions, systemFingerprint, executionTime, config: prompt } = history || {};
  const user = req.user;

  if (!promptId || promptId.trim() === '' || !executionTime || typeof executionTime !== 'number' || !executions || executions.length === 0 || !prompt) {
    console.error(`[ERR] add history record failed.`);
    return res.sendResponse(null, 3020);
  }

  let executionDate = new Date(executionTime);

  if (isNaN(executionDate.getTime())) {
    console.error(`[ERR] add history record failed due to execution time.`);
    return res.sendResponse(null, 3020);
  }

  if (!executions || executions.length === 0) {
    console.error(`[ERR] add history record failed. Empty prompt ID.`);
    return res.sendResponse(null, 3020);
  }

  try {
    promptId = promptId.trim();
    const promptRecord = await Prompt.findById(promptId).where({ deleted: false });
    if (!promptRecord || promptRecord.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3016);
    }

    let historyData = {
      executions, 
      promptid: promptId, 
      prompt, 
      executiontime: executionDate, 
      createdby: user._id.toString()
    };

    if (systemFingerprint && systemFingerprint.trim() !== '') {
      historyData.systemfingerprint = systemFingerprint;
    }

    const newHistory = new History(historyData);
    const savedHistory = await newHistory.save();
    return res.sendResponse(toDTO(savedHistory));
  } catch (error) {
    console.error(`[ERR] failed to add history record.` + error.stack);
    return res.sendResponse(null, 3020);
  }
}

async function labelHistory(req, res, next) {
  let { id, label } = req.body;
  const user = req.user;
  let now = new Date();

  if (!id || id.trim() === '') {
    return res.sendResponse(null, 3018);
  }

  if (![0, 1, 2].includes(label)) {
    return res.sendResponse(null, 3018);
  }

  try {
    id = id.trim();
    const history = await History.findById(id);
    if (!history || history.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3017);
    }

    if (history.label === label){
      // no need to update
      return res.sendResponse(toDTO(history));
    }

    const updatedHistory = await History.findByIdAndUpdate(
      id,
      { label, updated: now },
      { new: true }
    );

    return res.sendResponse(toDTO(updatedHistory));
  } catch (error) {
    console.error(`[ERR] failed to label history.` + error.stack);
    return res.sendResponse(null, 3018);
  }
}

async function removeAllHistory(req, res, next) {
  let { promptId } = req.body;
  const user = req.user;
  let now = new Date();

  if (!promptId || promptId.trim() === '') {
    console.error(`[ERR] remove history failed.`);
    return res.sendResponse(null, 3019);
  }

  try {
    promptId = promptId.trim();
    const prompt = await Prompt.findById(promptId).where({ deleted: false });
    if (!prompt || prompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3021); // Prompt not found or not created by the user
    }

    // Update all histories related to the prompt and not deleted
    await History.updateMany(
      { promptid: promptId, deleted: false },
      { deleted: true, updated: now }
    );

    return res.sendResponse();
  } catch (error) {
    console.error(`[ERR] failed to remove all histories.` + error.stack);
    return res.sendResponse(null, 3019); // Use appropriate error code
  }
}

async function getAllHistory(req, res, next) {
  const { promptId, pageSize, pageIndex, filter } = req.body;
  const user = req.user;

  if (!promptId || promptId.trim() === '') {
    console.error(`[ERR] get history record failed.`);
    return res.sendResponse(null, 3022);
  }

  const limit = parseInt(pageSize, 10) || 10; // Default to 10 if pageSize is not provided
  const skip = ((parseInt(pageIndex, 10) || 1) - 1) * limit;

  const resp = {reachLimit: false};

  try {
    const prompt = await Prompt.findById(promptId).where({ deleted: false });
    if (!prompt || prompt.createdby !== user._id.toString()) {
      return res.sendResponse(null, 3023); // Prompt not found or not created by the user
    }

    let query = { promptid: promptId, deleted: false };
    // if the list is empty or null or 'label' key doesn't exist, it means no filter for label
    if (Array.isArray(filter?.label) && filter.label.length > 0) {
      query.label = { $in: filter.label };
    }

    // Adjust query for 'basic' users
    if (user.membership === 'basic') {
      const totalHistories = await History.countDocuments({ promptid: promptId, deleted: false });
      // console.log(`totalHistories: ${totalHistories}`);
      if (totalHistories > 100) {
        // Fetch the latest 100 undeleted records
        const latest100Histories = await History.find({ promptid: promptId, deleted: false })
                                                .sort({ created: -1 })
                                                .limit(100);

        // Apply filters to the latest 100 records
        let filteredHistories = latest100Histories;
        if (Array.isArray(filter?.label) && filter.label.length > 0) {
          filteredHistories = latest100Histories.filter(history => filter.label.includes(history.label));
        }

        // Apply pagination to the filtered records
        const paginatedHistories = filteredHistories.slice(skip, skip + limit);

        if (paginatedHistories.length < limit) {
          resp.reachLimit = true;
        }

        resp.histories = paginatedHistories.map(history => toDTO(history));
        return res.sendResponse(resp);
      }
    }

    // Fetch histories for non-basic users
    const histories = await History.find(query).sort({ created: -1 }).skip(skip).limit(limit);
    resp.histories = histories.map(history => toDTO(history));
    return res.sendResponse(resp);
  } catch (error) {
    console.error(`[ERR] failed to get all histories.` + error.stack);
    return res.sendResponse(null, 3022);
  }
}

export { 
  addHistory,
  labelHistory,
  removeAllHistory,
  getAllHistory,
}