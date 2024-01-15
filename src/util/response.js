import corsHeaders from '../config/corsheaders.js';
import errorCodes from '../config/errorcode.js';

function getErrorMessage(code) {
  return errorCodes[code] || 'System error';
}

const setResponse = (req, res, next) => {
  const defaultCode = 200;

  res.sendResponse = (data = null, code = defaultCode) => {
    const response = {
      code,
      msg: getErrorMessage(code),
      data
    };
    return res.status(200).set(corsHeaders).send(response);
  };

  next();
};

export default setResponse;