/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsStorageService } from './services/aws-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { API_VERSIONS } from '../common/constants/api-versions';

@Controller('storage-test')
@UseGuards(JwtAuthGuard)
export class StorageTestController {
  constructor(private readonly awsStorageService: AwsStorageService) {}

  /**
   * Test file upload to S3
   */
  @Post('upload')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async testUpload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    // console.log('📁 File received:', {
    //   originalName: file.originalname,
    //   mimeType: file.mimetype,
    //   size: file.size,
    //   user: user.email,
    // });

    // Upload to S3
    const result = await this.awsStorageService.upload(file, {
      folder: `test-uploads/${user.id}`,
      isPublic: true,
      metadata: {
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
      },
    });

    return {
      message: 'File uploaded successfully!',
      file: result,
    };
  }

  /**
   * Test getting public URL
   * Changed from: @Get('url/:fileKey(*)')
   * To: @Get('url/*fileKey')
   */
  @Get('url/*fileKey')
  @Version(API_VERSIONS.V1)
  testGetUrl(@Param('fileKey') fileKey: string) {
    const url = this.awsStorageService.getUrl(fileKey);

    return {
      message: 'Public URL generated',
      fileKey,
      url,
    };
  }

  /**
   * Test getting signed URL (temporary access)
   * Changed from: @Get('signed-url/:fileKey(*)')
   * To: @Get('signed-url/*fileKey')
   */
  @Get('signed-url/*fileKey')
  @Version(API_VERSIONS.V1)
  async testGetSignedUrl(@Param('fileKey') fileKey: string) {
    // Check if file exists first
    const exists = await this.awsStorageService.exists(fileKey);

    if (!exists) {
      throw new BadRequestException('File not found in S3');
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await this.awsStorageService.getSignedUrl(fileKey, 3600);

    return {
      message: 'Signed URL generated (valid for 1 hour)',
      fileKey,
      signedUrl,
      expiresIn: '1 hour',
    };
  }

  /**
   * Test checking if file exists
   * Changed from: @Get('exists/:fileKey(*)')
   * To: @Get('exists/*fileKey')
   */
  @Get('exists/*fileKey')
  @Version(API_VERSIONS.V1)
  async testExists(@Param('fileKey') fileKey: string) {
    const exists = await this.awsStorageService.exists(fileKey);

    return {
      fileKey,
      exists,
      message: exists ? 'File exists in S3' : 'File not found in S3',
    };
  }

  /**
   * Test deleting file
   * Changed from: @Delete(':fileKey(*)')
   * To: @Delete('*fileKey')
   */
  @Delete('*fileKey')
  @Version(API_VERSIONS.V1)
  async testDelete(
    @Param('fileKey') fileKey: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Check if file exists
    const exists = await this.awsStorageService.exists(fileKey);

    if (!exists) {
      throw new BadRequestException('File not found in S3');
    }

    // Delete file
    await this.awsStorageService.delete(fileKey);

    return {
      message: 'File deleted successfully',
      fileKey,
      deletedBy: user.email,
    };
  }

  /**
   * Get S3 provider info
   */
  @Get('info')
  @Version(API_VERSIONS.V1)
  getInfo() {
    return {
      provider: this.awsStorageService.getProviderName(),
      message: 'AWS S3 storage service is active',
    };
  }
}
