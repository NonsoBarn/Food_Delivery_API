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
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { API_VERSIONS } from '../common/constants/api-versions';

@Controller('cloudinary-test')
@UseGuards(JwtAuthGuard)
export class CloudinaryTestController {
  constructor(
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  /**
   * Test file upload to Cloudinary
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

    // Validate file size (10MB max for Cloudinary)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate file type (images only for this test)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    console.log('📁 File received for Cloudinary:', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      user: user.email,
    });

    // Upload to Cloudinary
    const result = await this.cloudinaryStorageService.upload(file, {
      folder: `food-delivery/test/${user.id}`,
      metadata: {
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
      },
    });

    return {
      message: 'File uploaded successfully to Cloudinary!',
      file: result,
      transformations: {
        original: result.url,
        thumbnail: result.url.replace(
          '/upload/',
          '/upload/w_150,h_150,c_fill/',
        ),
        medium: result.url.replace('/upload/', '/upload/w_500,h_500,c_limit/'),
        webp: result.url.replace('/upload/', '/upload/f_webp,q_auto/'),
      },
    };
  }

  /**
   * Test getting public URL with transformations
   */
  @Get('url/*publicId')
  @Version(API_VERSIONS.V1)
  testGetUrl(@Param('publicId') publicId: string) {
    const url = this.cloudinaryStorageService.getUrl(publicId);

    return {
      message: 'Cloudinary URLs with transformations',
      publicId,
      urls: {
        original: url,
        thumbnail: url.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
        medium: url.replace('/upload/', '/upload/w_500,h_500/'),
        large: url.replace('/upload/', '/upload/w_1000,h_1000/'),
        webp: url.replace('/upload/', '/upload/f_webp,q_auto/'),
        circle: url.replace('/upload/', '/upload/w_200,h_200,c_fill,r_max/'),
      },
    };
  }

  /**
   * Test checking if file exists
   */
  @Get('exists/*publicId')
  @Version(API_VERSIONS.V1)
  async testExists(@Param('publicId') publicId: string) {
    const exists = await this.cloudinaryStorageService.exists(publicId);

    return {
      publicId,
      exists,
      message: exists
        ? 'File exists in Cloudinary'
        : 'File not found in Cloudinary',
    };
  }

  /**
   * Test deleting file
   */
  @Delete('*publicId')
  @Version(API_VERSIONS.V1)
  async testDelete(
    @Param('publicId') publicId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const exists = await this.cloudinaryStorageService.exists(publicId);

    if (!exists) {
      throw new BadRequestException('File not found in Cloudinary');
    }

    await this.cloudinaryStorageService.delete(publicId);

    return {
      message: 'File deleted successfully from Cloudinary',
      publicId,
      deletedBy: user.email,
    };
  }

  /**
   * Get Cloudinary provider info
   */
  @Get('info')
  @Version(API_VERSIONS.V1)
  getInfo() {
    return {
      provider: this.cloudinaryStorageService.getProviderName(),
      message: 'Cloudinary storage service is active',
      features: [
        'Automatic image optimization',
        'On-the-fly transformations',
        'Global CDN delivery',
        'Format conversion (JPG, PNG, WebP)',
        'Responsive images',
      ],
    };
  }
}
