/**
 * Vercel Serverless Handler for NestJS
 * This file is automatically called by Vercel for all /api/* requests
 */

let nestApp;

module.exports = async (req, res) => {
  try {
    // Initialize NestJS app only once (cold start optimization)
    if (!nestApp) {
      console.log('🔧 Initializing NestJS app...');

      // Import the built main.js which exports createServerlessApp
      const { createServerlessApp } = require('../dist/apps/api/main.js');

      if (!createServerlessApp) {
        throw new Error('createServerlessApp not exported from main.js');
      }

      nestApp = await createServerlessApp();
      console.log('✅ NestJS app initialized for request handling');
    }

    // Handle the request through NestJS
    const httpAdapter = nestApp.getHttpAdapter();
    return httpAdapter.getInstance()(req, res);
  } catch (error) {
    console.error('❌ API Error:', error);
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
