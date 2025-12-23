import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { API_VERSIONS } from '../common/constants/api-versions';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import type { RequestUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(authCredentialsDto);
  }

  @Post('refresh')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: RequestUser): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  @Get('test-protected')
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard)
  testProtected(@CurrentUser() user: RequestUser) {
    return {
      message: 'This is a protected route!',
      user: user,
    };
  }
}
