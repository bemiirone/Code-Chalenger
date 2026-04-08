import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionEntity, SessionSchema } from '../database/schemas/session.schema';
import { SubmissionEntity, SubmissionSchema } from '../database/schemas/submission.schema';
import { ChallengesModule } from '../challenges/challenges.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionEntity.name, schema: SessionSchema },
      { name: SubmissionEntity.name, schema: SubmissionSchema },
    ]),
    ChallengesModule,
    ScoringModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
