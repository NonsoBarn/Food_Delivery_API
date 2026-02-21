import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload, RequestUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') || 'default-fallback-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // This runs AFTER token signature is verified
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Build response with proper typing
    const response: RequestUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Add vendor profile if exists (for vendors)
    if (user.vendorProfile) {
      response.vendorProfile = {
        id: user.vendorProfile.id,
        businessName: user.vendorProfile.businessName,
        status: user.vendorProfile.status,
      };
    }

    // Add customer profile if exists (for customers)
    // Needed by the order system to know the customer's ID and default address
    if (user.customerProfile) {
      response.customerProfile = {
        id: user.customerProfile.id,
        deliveryAddress: user.customerProfile.deliveryAddress,
        city: user.customerProfile.city,
        state: user.customerProfile.state,
        postalCode: user.customerProfile.postalCode,
        latitude: user.customerProfile.latitude,
        longitude: user.customerProfile.longitude,
      };
    }

    // Add rider profile if exists (for riders)
    // Needed by the delivery system to know the rider's profile ID and status
    if (user.riderProfile) {
      response.riderProfile = {
        id: user.riderProfile.id,
        status: user.riderProfile.status,
        availabilityStatus: user.riderProfile.availabilityStatus,
      };
    }

    // This object will be attached to request.user
    return response;
  }
}
