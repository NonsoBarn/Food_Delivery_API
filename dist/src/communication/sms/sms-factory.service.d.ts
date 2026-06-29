import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SmsProviderConfig } from './entities/sms-provider-config.entity';
import { TwilioSmsService } from './providers/twilio-sms.service';
import { AfricasTalkingSmsService } from './providers/africas-talking-sms.service';
import type { ISmsService } from './interfaces/sms-service.interface';
export declare class SmsFactoryService {
    private readonly configService;
    private readonly twilioService;
    private readonly africasTalkingService;
    private readonly configRepository;
    private readonly logger;
    private readonly defaultProvider;
    constructor(configService: ConfigService, twilioService: TwilioSmsService, africasTalkingService: AfricasTalkingSmsService, configRepository: Repository<SmsProviderConfig>);
    getSmsService(): Promise<ISmsService>;
    getServiceByProvider(provider: string): ISmsService;
    private resolveProvider;
}
