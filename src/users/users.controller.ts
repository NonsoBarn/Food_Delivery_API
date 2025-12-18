import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Version,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { API_VERSIONS } from '../common/constants/api-versions';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post('register')
  // async register(
  //   @Body(ValidationPipe) createUserDto: CreateUserDto,
  // ): Promise<UserResponseDto> {
  //   return this.usersService.create(createUserDto);
  // }

  // Note2self : should be in its own controller {src/users/v2/users.controller.ts}
  @Post('register')
  @Version(API_VERSIONS.V2)
  async register2(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }
}
