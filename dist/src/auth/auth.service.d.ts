import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService);
    login(authCredentialsDto: AuthCredentialsDto): Promise<AuthResponseDto>;
    refreshTokens(refreshToken: string): Promise<AuthResponseDto>;
    validateUserById(userId: string): Promise<User>;
    private generateTokens;
}
