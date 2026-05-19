import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: { id: 'uuid', email: 'user@example.com', role: 'customer' } })
  user: { id: string; email: string; role: string };

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
