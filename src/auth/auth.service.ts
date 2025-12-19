import {
  Injectable,
  UnauthorizedException,
  Logger,
  //   BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    const { email, password } = authCredentialsDto;

    this.logger.log(`Login attempt for email: ${email}`);

    // Validate user credentials
    const user = await this.usersService.validateUser(email, password);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in successfully: ${user.id}`);

    return new AuthResponseDto({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      });

      // Get user
      const user = await this.usersService.findByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      this.logger.log(`Tokens refreshed for user: ${user.id}`);

      return new AuthResponseDto({
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        'Refresh token validation failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUserById(userId: string): Promise<User> {
    const user = await this.usersService.findByEmail(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Generate access token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get('jwt.accessTokenExpiration'),
      }),

      // Generate refresh token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshTokenSecret'),
        expiresIn: this.configService.get('jwt.refreshTokenExpiration')!,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
