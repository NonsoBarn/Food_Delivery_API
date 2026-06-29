import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import type { RequestUser } from './interfaces/jwt-payload.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(authCredentialsDto: AuthCredentialsDto): Promise<AuthResponseDto>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    getProfile(user: RequestUser): UserResponseDto;
    testProtected(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
}
