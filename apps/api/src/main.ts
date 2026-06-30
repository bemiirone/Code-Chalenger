import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

let cachedApp: INestApplication | null = null;

/** Shared configuration applied to both serverless and local dev instances. */
async function configureApp(app: INestApplication): Promise<void> {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Code Challenger API')
    .setDescription('AI-powered code challenge platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
}

/**
 * Factory for serverless environments (e.g., Vercel).
 * Returns the initialized app without calling listen().
 */
export async function createServerlessApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  await configureApp(app);

  const clientUrl = process.env['CLIENT_URL'] || `https://${process.env['VERCEL_URL']}`;
  app.enableCors({
    origin: clientUrl ? [clientUrl, `https://${clientUrl}`] : '*',
    credentials: true,
  });

  await app.init();
  cachedApp = app;
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  await configureApp(app);

  app.enableCors({ origin: process.env['CLIENT_URL'] ?? 'http://localhost:4200' });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`Application running at http://localhost:${port}/api`);
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

// Only start the HTTP server in local dev — Vercel uses createServerlessApp() instead
if (!process.env['VERCEL']) {
  bootstrap();
}
