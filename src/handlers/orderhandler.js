import {insertStripeCustomerId} from './userhandler.js'
import User from '../db/user.js';
import Order from '../db/order.js';
import Stripe from 'stripe';
import fetch from 'node-fetch';

import * as dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const GOOGLE_ANALYTICS_CLIENT_ID = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
const GOOGLE_ANALYTICS_API_KEY = process.env.GOOGLE_ANALYTICS_API_KEY;

async function createStripeOrder(req, res){
  const user = req.user;
  const { subscription } = req.body;
  let stripecid = user?.stripecid;
  const email = user.email;

  const pricingid = (subscription === "month") ? process.env.STRIPE_MONTH_PRICING_ID : process.env.STRIPE_YEAR_PRICING_ID;

  try {
    if (!stripecid) {
      // set up stripe customer user if not exist
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          'puid': user._id.toString(),
        },
      });
      
      stripecid = customer.id;
      await insertStripeCustomerId(user._id, stripecid);
    }
  
    // create checkout session
    const sessionparams = {
      line_items: [
        {
          price: pricingid,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: process.env.PAYMENT_SUCCESS_URL,
      cancel_url: process.env.PAYMENT_CANCEL_URL,
      customer: stripecid,
      metadata: {
        analyticsClientId: user._id.toString(),
      },
    }
  
    const session = await stripe.checkout.sessions.create(sessionparams);
  
    console.log(`create order session: ${JSON.stringify(session)}`);
    return res.sendResponse({ url: session.url });
  } catch(error) {
    console.error(error);
    return res.sendResponse(null, 2001);
  }
}

async function createManagePortal(req, res) {
  const user = req.user;
  let stripecid = user?.stripecid;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripecid,
      return_url: process.env.PAYMENT_RETURN_URL,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
    });

    console.log(`manage portal session: ${JSON.stringify(session)}`);
    return res.sendResponse({ url: session.url });
  } catch(error) {
    console.error(error);
    return res.sendResponse(null, 2002);
  }
}

async function receivedStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    // On error, log and return the error message
    console.log(`❌ Error message: ${err.message}`);
    return res.status(400).send(`Webhook Error.`);
  }

  // Successfully constructed event
  console.log('✅ Success:', event.id);

  // Cast event data to Stripe object
  if (event?.type === 'invoice.paid') {
    // get subscription data
    const invoice = event.data.object;
    const transactionid = invoice?.payment_intent;
    const subscriptionId = invoice?.subscription;
    const extuserid = invoice?.customer;
    const amount = invoice?.amount_paid;
    const created = new Date(invoice?.created * 1000);

    let user;
    let userid;
    try {
      // check if user exists
      user = await User.findOne({ stripecid: extuserid });
      if (!user) {
        return res.sendResponse({received: true});
      }

      userid = user?._id;
      // check if the transaction already processed
      let order = await Order.findOne({ transactionid, userid });
      if (order) {
        return res.sendResponse({received: true});
      }
    } catch (err) {
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error.`);
    }
    
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`subscription: ${JSON.stringify(subscription)}`);
      const current_period_end = new Date(subscription?.current_period_end * 1000);

      const now = new Date();
      // update user expired & membership
      await User.updateOne({ _id: user?._id }, {expired: current_period_end, updated: now, membership: 'plus'});
      
      // update order
      const order = new Order({
        userid: userid,
        extuserid: extuserid,
        email: user.email,
        amount: amount,
        status: 'finish',
        paymethod: 'stripe',
        transactionid: transactionid,
        details: subscription,
      });
      await order.save();
    } catch (err) {
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error.`);
    }
  } else if (event?.type === 'checkout.session.completed') {
    try {
      console.log(`start checkout.session.completed.`);

      // Record metrics using the Google Analytics Measurement Protocol
      // See https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide
      const measurement_id = GOOGLE_ANALYTICS_CLIENT_ID;
      const api_secret = GOOGLE_ANALYTICS_API_KEY;
      const transactionId = event.data.object.id;
      const clientId = event.data.object.metadata.analyticsClientId;
      const amount = event.data.object.amount_total / 100;
      const currency = event.data.object.currency;

      const body = JSON.stringify({
          client_id: clientId,
          events: [{
              name: "purchase",
              params: {
                  transaction_id: transactionId,
                  value: amount,
                  currency: currency,
                  // You can add additional parameters here as needed
              },
          }],
      });

      const resp = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`, {
          method: 'POST',
          headers: {
              "Content-Type": "application/json",
          },
          body: body,
      });

      console.log(`checkout.session.completed resp: ${JSON.stringify(resp)}`);
    } catch (error) {
      console.warn("Error sending data to Google Analytics: ", error);
    }  
  }

  // Return a response to acknowledge receipt of the event
  return res.sendResponse({received: true});
}

export {
  createStripeOrder,
  createManagePortal,
  receivedStripeWebhook,
};