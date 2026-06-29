import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EmailProviderConfig } from './entities/email-provider-config.entity';
import { SendGridEmailService } from './providers/sendgrid-email.service';
import { NodemailerEmailService } from './providers/nodemailer-email.service';
import type { IEmailService } from './interfaces/email-service.interface';
export declare class EmailFactoryService {
    private readonly configService;
    private readonly sendGridService;
    private readonly nodemailerService;
    private readonly configRepository;
    private readonly logger;
    private readonly defaultProvider;
    constructor(configService: ConfigService, sendGridService: SendGridEmailService, nodemailerService: NodemailerEmailService, configRepository: Repository<EmailProviderConfig>);
    getEmailService(): Promise<IEmailService>;
    getServiceByProvider(provider: string): IEmailService;
    private resolveProvider;
}
