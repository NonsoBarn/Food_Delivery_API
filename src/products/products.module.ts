import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { CategoriesModule } from './categories.module';
import { StorageModule } from 'src/storage/storage.module';
import { ProductImagesService } from './product-images.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    CategoriesModule, // Import to access CategoriesService
    StorageModule,
  ],

  controllers: [ProductsController],

  providers: [ProductsService, ProductImagesService],

  exports: [ProductsService, ProductImagesService],
})
export class ProductsModule {}
