import * as dotenv from 'dotenv';
dotenv.config();

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-prompter-token',
};

export default corsHeaders;