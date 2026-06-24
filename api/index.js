/**
 * Vercel Serverless Handler for NestJS
 * This file is automatically called by Vercel for all /api/* requests
 */

// Cache the NestJS app instance across cold starts
let nestApp;

module.exports = async (req, res) => {
  try {
    // Initialize NestJS app only once (cold start optimization)
    if (!nestApp) {
      const { NestFactory } = require('@nestjs/core');
      const { ValidationPipe, Logger } = require('@nestjs/common');
      const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

      // Import the built AppModule
      const { AppModule } = require('../dist/apps/api/app/app.module');

      nestApp = await NestFactory.create(AppModule, null, {
        logger: ['error', 'warn'],
      });

      // Configuration
      nestApp.setGlobalPrefix('');
      nestApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );

      // CORS - Allow requests from your frontend
      const clientUrl =
        process.env.CLIENT_URL || `https://${process.env.VERCEL_URL}`;
      nestApp.enableCors({
        origin: clientUrl ? [clientUrl, `https://${clientUrl}`] : '*',
        credentials: true,
      });

      // Swagger Documentation
      const config = new DocumentBuilder()
        .setTitle('Code Challenger API')
        .setDescription('AI-powered code challenge platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(nestApp, config);
      SwaggerModule.setup('api/docs', nestApp, document);

      await nestApp.init();
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
