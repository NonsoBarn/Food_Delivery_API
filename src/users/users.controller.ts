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
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { API_VERSIONS } from '../common/constants/api-versions';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ResourceOwnerGuard } from 'src/common/guards/resource-owner.guard';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  // Note2self : should be in its own controller {src/users/v2/users.controller.ts}
  @Post('register')
  @Version(API_VERSIONS.V2)
  async register2(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  // Protected - only admins can list all users
  @Get()
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  // Protected - only admins can view any user
  @Get(':id')
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  // Usage of Resource Ownership Guard
  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard, ResourceOwnerGuard)
  getProfile(@Param('userId') userId: string) {
    console.log(userId);
    // User can only view their own profile (or admin can view any)
  }
}
