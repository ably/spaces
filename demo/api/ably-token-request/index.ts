import * as dotenv from 'dotenv';
import * as Ably from 'ably';
import { HandlerEvent } from '@netlify/functions';

dotenv.config();

export async function handler(event: HandlerEvent) {
  if (!process.env.ABLY_API_KEY) {
    console.error(`
Missing ABLY_API_KEY environment variable.
If you're running locally, please ensure you have a ./.env file with a value for ABLY_API_KEY=your-key.
If you're running in Netlify, make sure you've configured env variable ABLY_API_KEY.

Please see README.md for more details on configuring your Ably API Key.`);

    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify('ABLY_API_KEY is not set'),
    };
  }

  const clientId = event.queryStringParameters?.['clientId'] || process.env.DEFAULT_CLIENT_ID || 'NO_CLIENT_ID';
  const client = new Ably.Rest(process.env.ABLY_API_KEY);
  const tokenRequestData = await client.auth.createTokenRequest({ clientId: clientId });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tokenRequestData),
  };
}
