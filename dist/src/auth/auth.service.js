"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const auth_response_dto_1 = require("./dto/auth-response.dto");
let AuthService = AuthService_1 = class AuthService {
    usersService;
    jwtService;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(usersService, jwtService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async login(authCredentialsDto) {
        const { email, password } = authCredentialsDto;
        this.logger.log(`Login attempt for email: ${email}`);
        const user = await this.usersService.validateUser(email, password);
        if (!user) {
            this.logger.warn(`Failed login attempt for email: ${email}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens(user);
        this.logger.log(`User logged in successfully: ${user.id}`);
        return new auth_response_dto_1.AuthResponseDto({
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('jwt.refreshTokenSecret'),
            });
            const user = await this.usersService.findByEmail(payload.email);
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(user);
            this.logger.log(`Tokens refreshed for user: ${user.id}`);
            return new auth_response_dto_1.AuthResponseDto({
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
            });
        }
        catch (error) {
            this.logger.error('Refresh token validation failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async validateUserById(userId) {
        const user = await this.usersService.findByEmail(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('jwt.secret'),
                expiresIn: this.configService.get('jwt.accessTokenExpiration'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('jwt.refreshTokenSecret'),
                expiresIn: this.configService.get('jwt.refreshTokenExpiration'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map