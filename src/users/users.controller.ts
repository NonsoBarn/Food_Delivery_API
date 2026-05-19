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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { API_VERSIONS } from '../common/constants/api-versions';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ResourceOwnerGuard } from 'src/common/guards/resource-owner.guard';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Post('register')
  @Version(API_VERSIONS.V2)
  @ApiOperation({ summary: 'Register a new user (v2)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async register2(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users', description: 'Roles: admin' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Version(API_VERSIONS.V1)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID', description: 'Roles: admin' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard, ResourceOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own profile (resource owner only)' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the resource owner' })
  getProfile(@Param('userId') userId: string) {
    console.log(userId);
  }
}
