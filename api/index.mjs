/**
 * Vercel Serverless Handler for NestJS (CJS bundle via webpack)
 * This file is automatically called by Vercel for all /api/* requests.
 * Uses createRequire to load the CJS bundle from ESM context.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let nestApp;

export default async (req, res) => {
  try {
    // Initialize NestJS app only once (cold start optimization)
    if (!nestApp) {
      console.log('Initializing NestJS app...');

      // Require the CJS webpack bundle — no .js extension issues
      const { createServerlessApp } = require('../dist/apps/api/main.js');

      if (!createServerlessApp) {
        throw new Error('createServerlessApp not exported from main.js');
      }

      nestApp = await createServerlessApp();
      console.log('NestJS app initialized');
    }

    // Handle the request through NestJS
    const httpAdapter = nestApp.getHttpAdapter();
    return httpAdapter.getInstance()(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 500,
        message: 'Internal server error',
        error:
          process.env.NODE_ENV === 'production' ? undefined : error.message,
      }),
    );
  }
};
