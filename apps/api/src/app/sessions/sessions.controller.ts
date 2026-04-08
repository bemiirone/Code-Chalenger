import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StartSessionDto, SubmitAnswerDto } from '@code-challenger/shared';

interface AuthUser {
  userId: string;
  email: string;
}

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new challenge session' })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartSessionDto) {
    return this.sessionsService.startSession(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sessions for current user' })
  list(@CurrentUser() user: AuthUser) {
    return this.sessionsService.getUserSessions(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session with populated challenges' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessionsService.getSession(id, user.userId);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit answer for a challenge in a session' })
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitAnswerDto) {
    return this.sessionsService.submitAnswer(user.userId, dto);
  }
}
