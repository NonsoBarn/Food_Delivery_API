export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
