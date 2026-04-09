import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ScoringService } from './scoring.service';
import { ScoringProcessor } from './scoring.processor';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { SubmissionEntity, SubmissionSchema } from '../database/schemas/submission.schema';
import { SessionEntity, SessionSchema } from '../database/schemas/session.schema';
import { SCORING_QUEUE } from './scoring.constants';

@Module({
  imports: [
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
    MongooseModule.forFeature([
      { name: SubmissionEntity.name, schema: SubmissionSchema },
      { name: SessionEntity.name, schema: SessionSchema },
    ]),
  ],
  providers: [ScoringService, ScoringProcessor, AiProviderFactory, OpenAiProvider, AnthropicProvider],
  exports: [ScoringService],
})
export class ScoringModule {}
