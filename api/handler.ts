import { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';

// Global cache for NestJS app instance
let cachedApp: any;

/**
 * Vercel Serverless Handler for NestJS API
 * 
 * This handler:
 * 1. Creates NestJS app on first request (cold start)
 * 2. Reuses app instance on subsequent requests (warm)
 * 3. Routes requests through the NestJS server
 */
async function bootstrap() {
  if (!cachedApp) {
    try {
      // Dynamically import the built AppModule
      const { AppModule } = await import('../dist/apps/api/app/app.module');

      cachedApp = await NestFactory.create(AppModule, null, {
        logger: ['error', 'warn'],
      });

      // Configure NestJS
      cachedApp.setGlobalPrefix('');
      cachedApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

      // CORS configuration - important for cross-origin requests
      const clientUrl = process.env['CLIENT_URL'] || process.env['VERCEL_URL'];
      cachedApp.enableCors({
        origin: clientUrl ? [clientUrl, `https://${clientUrl}`] : true,
        credentials: true,
      });

      await cachedApp.init();
      Logger.log('✅ NestJS app initialized', 'Handler');
    } catch (error) {
      Logger.error('❌ Failed to initialize NestJS app', error, 'Handler');
      throw error;
    }
  }
  return cachedApp;
}

/**
 * Vercel Request Handler
 * Accepts incoming HTTP requests and passes them to NestJS
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const app = await bootstrap();
    const httpAdapter = app.getHttpAdapter();

    // Handle the request through NestJS
    return httpAdapter.getInstance()(req, res);
  } catch (error) {
    Logger.error('Request handler error', error, 'Handler');
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

