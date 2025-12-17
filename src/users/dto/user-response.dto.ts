/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  password: string; // Never expose password!

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
