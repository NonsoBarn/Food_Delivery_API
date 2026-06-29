export declare class UserResponseDto {
    id: string;
    email: string;
    role: string;
    createdAt?: Date;
    updatedAt?: Date;
    password?: string;
    constructor(partial: Partial<UserResponseDto>);
}
