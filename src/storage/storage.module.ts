import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsStorageService } from './services/aws-storage.service';
import awsConfig from './config/aws.config';
import cloudinaryConfig from './config/cloudinary.config';
import digitaloceanConfig from './config/digitalocean.config';
import storageConfig from './config/storage.config';
import { StorageTestController } from './storage-test.controller';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { CloudinaryTestController } from './cloudinary-test.controller';

@Module({
  imports: [
    ConfigModule.forFeature(awsConfig),
    ConfigModule.forFeature(cloudinaryConfig),
    ConfigModule.forFeature(digitaloceanConfig),
    ConfigModule.forFeature(storageConfig),
  ],
  controllers: [StorageTestController, CloudinaryTestController],
  providers: [AwsStorageService, CloudinaryStorageService],
  exports: [AwsStorageService, CloudinaryStorageService],
})
export class StorageModule {}
