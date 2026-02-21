import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsProvider } from './enums/sms-provider.enum';
import { SmsProviderConfig } from './entities/sms-provider-config.entity';
import { TwilioSmsService } from './providers/twilio-sms.service';
import { AfricasTalkingSmsService } from './providers/africas-talking-sms.service';
import type { ISmsService } from './interfaces/sms-service.interface';

/**
 * SmsFactoryService
 *
 * Same pattern as EmailFactoryService — selects active SMS provider.
 * DB-first, env-fallback. Mirror of PaymentFactoryService.
 */
@Injectable()
export class SmsFactoryService {
  private readonly logger = new Logger(SmsFactoryService.name);
  private readonly defaultProvider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioService: TwilioSmsService,
    private readonly africasTalkingService: AfricasTalkingSmsService,

    @InjectRepository(SmsProviderConfig)
    private readonly configRepository: Repository<SmsProviderConfig>,
  ) {
    this.defaultProvider =
      this.configService.get<string>('sms.defaultProvider') ?? 'twilio';
  }

  async getSmsService(): Promise<ISmsService> {
    const dbConfig = await this.configRepository.findOne({
      where: { isEnabled: true },
    });

    const provider = dbConfig?.provider ?? this.defaultProvider;

    this.logger.debug(`Using SMS provider: ${provider}`);

    return this.resolveProvider(provider);
  }

  getServiceByProvider(provider: string): ISmsService {
    return this.resolveProvider(provider);
  }

  private resolveProvider(provider: string): ISmsService {
    switch (provider) {
      case SmsProvider.TWILIO:
        return this.twilioService;
      case SmsProvider.AFRICAS_TALKING:
        return this.africasTalkingService;
      default:
        throw new Error(
          `Unknown SMS provider: "${provider}". Valid options: ${Object.values(SmsProvider).join(', ')}`,
        );
    }
  }
}
