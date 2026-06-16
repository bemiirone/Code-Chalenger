import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Difficulty } from '@code-challenger/shared';

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'List challenges (no solution_code)' })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['Easy', 'Medium', 'Hard'] })
  findAll(
    @Query('language') language?: string,
    @Query('difficulty') difficulty?: Difficulty,
  ) {
    return this.challengesService.findAll(language, difficulty);
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get distinct languages and their available difficulties' })
  getLanguages() {
    return this.challengesService.getLanguages();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get challenge by ID (no solution_code)' })
  findOne(@Param('id') id: string) {
    return this.challengesService.findById(id);
  }
}
