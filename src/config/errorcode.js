const errorCodes = {
  200: "Success",
  400: 'System error',

  // user related 1000-1999
  1001: 'Invalid verification code. Please enter the correct one and try again.',
  1002: 'Failed to create user',
  1003: 'Failed to send Email verification code',
  1004: 'Missing authentication token',
  1005: 'Invalid authentication token',
  1006: 'Failed to authenticate Google user',

  1101: 'Invalid API key',
  1102: 'Invalid settings. Please check it',
  1103: 'Invalid custom API endpoint',

  1201: 'Please upgrade to Plus Plan to create more prompts',
  1202: 'Please upgrade to Plus Plan to get more history records',

  // order related 2000-2999
  2001: 'Failed to create order',
  2002: 'Failed to create portal URL',

  // prompt related 3000-3999
  3001: 'Failed to create project',
  3002: 'Project name is empty',
  3003: 'Failed to update project',
  3004: 'No permission to update project',
  3005: 'Failed to remove project',
  3006: 'No permission to remove project',
  3007: 'Failed to get prompts',
  3008: 'No permission to get prompt',
  3009: 'Failed to create prompt',
  3010: 'No permission to create prompt',
  3011: 'Failed to duplicate prompt',
  3012: 'Failed to remove prompt',
  3013: 'Failed to get prompt detail',
  3014: 'Failed to update prompt',
  3015: 'No permission to update prompt',
  3016: 'No permission to add history record',
  3017: 'No permission to label history record',
  3018: 'Failed to label history',
  3019: 'Failed to remove history records',
  3020: 'Failed to add history record',
  3021: 'No permission to remove history',
  3022: 'Failed to get history records',
  3023: 'No permission to get history records',
}

export default errorCodes;