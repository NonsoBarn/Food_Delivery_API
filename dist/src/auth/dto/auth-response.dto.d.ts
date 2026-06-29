export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
    };
    constructor(partial: Partial<AuthResponseDto>);
}
