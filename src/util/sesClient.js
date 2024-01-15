import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import * as dotenv from 'dotenv';
dotenv.config();

// Set the AWS Region.
const REGION = "us-east-1";
// Create SES service object.
const sesClient = new SESClient({ region: REGION });

const PROMPTER_NOTIFY_EMAIL = process.env.PROMPTER_NOTIFY_EMAIL;
const appBaseURL = process.env.APP_BASE_URL;
const baseURL = process.env.BASE_URL;

async function sendLoginOTP(toAddress, otp) {
  const subject = "Login for Prompter";
  const body = `To login to Prompter, please follow this link: 

https://${appBaseURL}/auth?email=${toAddress}&otp=${otp}
  
Or enter this verification code on the login page:
  
${otp}
  
This link and code will only be valid for the next 2 minutes.

To make sure you continue to receive important account emails from our support team, whitelist *.${baseURL}

——
Yours securely,
Team Prompter
https://${baseURL}`;

  const emailCommand = new SendEmailCommand({
    Destination: {
      /* required */
      CcAddresses: [
        /* more items */
      ],
      ToAddresses: [
        toAddress,
        /* more To-email addresses */
      ],
    },
    Message: {
      /* required */
      Body: {
        // /* required */
        // Html: {
        //   Charset: "UTF-8",
        //   Data: "HTML_FORMAT_BODY",
        // },
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: PROMPTER_NOTIFY_EMAIL,
    ReplyToAddresses: [
      /* more items */
    ],
  });

  const resp = await sesClient.send(emailCommand);
};

export {
  sendLoginOTP,
};