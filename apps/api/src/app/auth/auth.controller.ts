import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto, LoginDto, AuthResponse } from '@code-challenger/shared';

interface AuthUser { userId: string; email: string; }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ schema: { type: 'object', required: ['email', 'password', 'displayName'], properties: { email: { type: 'string', example: 'user@example.com' }, password: { type: 'string', example: 'password123' }, displayName: { type: 'string', example: 'Jane Doe' } } } })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive JWT' })
  @ApiBody({ schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'user@example.com' }, password: { type: 'string', example: 'password123' } } } })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.userId);
  }
}
