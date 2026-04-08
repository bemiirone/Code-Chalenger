import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env['CLIENT_URL'] ?? 'http://localhost:4200' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Code Challenger API')
    .setDescription('AI-powered code challenge platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`Application running at http://localhost:${port}/api`);
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
