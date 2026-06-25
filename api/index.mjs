/**
 * Vercel Serverless Handler for NestJS (ESM)
 * This file is automatically called by Vercel for all /api/* requests
 * Imports the transpiled ESM modules and uses them to handle requests
 */

let nestApp;

export default async (req, res) => {
  try {
    // Initialize NestJS app only once (cold start optimization)
    if (!nestApp) {
      console.log('🔧 Initializing NestJS app...');

      // Import the transpiled ESM main module
      // The API is now compiled as native ESM modules instead of webpack bundles
      const { createServerlessApp } = await import('../dist/apps/api/main.js');

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
