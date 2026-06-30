import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ScoringService } from './scoring.service';
import { ScoringProcessor } from './scoring.processor';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { SubmissionEntity, SubmissionSchema } from '../database/schemas/submission.schema';
import { SessionEntity, SessionSchema } from '../database/schemas/session.schema';
import { SCORING_QUEUE } from './scoring.constants';

// Only connect to Redis when explicitly configured — skipped on Vercel
const redisAvailable = !!(process.env['REDIS_HOST'] || process.env['REDIS_URL']);

const bullImports = redisAvailable
  ? [
      BullModule.forRootAsync({
        useFactory: (config: ConfigService) => ({
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        }),
        inject: [ConfigService],
      }),
      BullModule.registerQueue({ name: SCORING_QUEUE }),
    ]
  : [];

// ScoringProcessor registers a BullMQ worker — only include it when Redis is available
const scoringProviders = redisAvailable
  ? [ScoringService, ScoringProcessor, AiProviderFactory, AnthropicProvider, GeminiProvider]
  : [ScoringService, AiProviderFactory, AnthropicProvider, GeminiProvider];

@Module({
  imports: [
    ...bullImports,
    MongooseModule.forFeature([
      { name: SubmissionEntity.name, schema: SubmissionSchema },
      { name: SessionEntity.name, schema: SessionSchema },
    ]),
  ],
  providers: scoringProviders,
  exports: [ScoringService],
})
export class ScoringModule {}
