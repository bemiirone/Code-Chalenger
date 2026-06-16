import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

interface Auth0User {
  auth0Sub: string;
  email: string;
  name?: string;
  picture?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile, auto-provisioning if first login' })
  async me(@CurrentUser() user: Auth0User) {
    return this.authService.findOrCreateByAuth0Sub(user);
  }
}
