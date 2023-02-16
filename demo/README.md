# Spaces Demo

An app showcasing the usage of different multiplayer features enabled by the spaces API.

## Setup

First, create a `.env` file in this folder, based on the `.env.example`. You will need environment variables listed in there.

You will need [node.js](https://nodejs.org/en/) & the [netlify cli](https://docs.netlify.com/cli/get-started/) installed. The demo has separate depdendecies to the library, you will need to run `npm install` in this folder as well as the root one.

To run the development server, do `npm run start`. This will start a Netlify dev server, and will make sure the auth endpoint in `api` works correctly locally.

## Deployment

To deploy, you will need access to the Ably Netlify account. If you have that, [login to Netlify on your machine with the CLI](https://docs.netlify.com/cli/get-started/#obtain-a-token-with-the-command-line). The run `npm run deploy` to deploy a test site and `npm run deploy:production` to deploy the production site.
