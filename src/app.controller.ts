import {
  Controller,
  Get,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Test 404 error
  @Get('test/not-found')
  testNotFound() {
    throw new NotFoundException('This resource does not exist');
  }

  // Test 400 error
  @Get('test/bad-request')
  testBadRequest() {
    throw new BadRequestException('Invalid request parameters');
  }

  // Test 500 error
  @Get('test/server-error')
  testServerError() {
    throw new Error('Something went wrong!');
  }

  // Test validation error
  @Get('test/validation')
  testValidation() {
    throw new BadRequestException([
      'email must be an email',
      'password must be longer than 6 characters',
    ]);
  }
}
