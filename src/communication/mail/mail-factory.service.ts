import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailProvider } from './enums/email-provider.enum';
import { EmailProviderConfig } from './entities/email-provider-config.entity';
import { SendGridEmailService } from './providers/sendgrid-email.service';
import { NodemailerEmailService } from './providers/nodemailer-email.service';
import type { IEmailService } from './interfaces/email-service.interface';

/**
 * EmailFactoryService
 *
 * The factory selects the correct email provider on every send request.
 *
 * KEY LEARNING: The Factory Pattern
 * ====================================
 * A factory is an object whose only job is to CREATE (or select) the right
 * implementation based on some condition. It hides the selection logic
 * from the rest of the app.
 *
 * Without a factory:
 *   // Every class that sends email must know about SendGrid AND Nodemailer
 *   if (config === 'sendgrid') { ... } else { ... }
 *   // Duplicated in MailProcessor, CommunicationEventsListener, tests, etc.
 *
 * With a factory:
 *   const emailService = await this.factory.getEmailService();
 *   await emailService.sendWelcome(to, role);
 *   // The caller has NO idea which provider was used. Doesn't need to know.
 *
 * KEY LEARNING: DB-first, env-fallback selection
 * ================================================
 * 1. Query DB for a provider row where isEnabled = true
 * 2. If found → use that provider (admin's runtime choice)
 * 3. If not found → use DEFAULT_EMAIL_PROVIDER env var (startup default)
 * 4. If still not found → throw (misconfiguration, fail loudly)
 *
 * This mirrors how PaymentFactoryService works.
 */
@Injectable()
export class EmailFactoryService {
  private readonly logger = new Logger(EmailFactoryService.name);
  private readonly defaultProvider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sendGridService: SendGridEmailService,
    private readonly nodemailerService: NodemailerEmailService,

    @InjectRepository(EmailProviderConfig)
    private readonly configRepository: Repository<EmailProviderConfig>,
  ) {
    this.defaultProvider =
      this.configService.get<string>('mail.defaultProvider') ?? 'sendgrid';
  }

  /**
   * Returns the active IEmailService implementation.
   *
   * Called by the MailProcessor before each job is processed.
   * The DB query is cheap (~1ms) and ensures admin changes take effect immediately.
   */
  async getEmailService(): Promise<IEmailService> {
    // Check DB for admin-enabled provider
    const dbConfig = await this.configRepository.findOne({
      where: { isEnabled: true },
    });

    const provider = dbConfig?.provider ?? this.defaultProvider;

    this.logger.debug(`Using email provider: ${provider}`);

    return this.resolveProvider(provider);
  }

  /**
   * Get a specific provider by name — useful for testing or admin override.
   */
  getServiceByProvider(provider: string): IEmailService {
    return this.resolveProvider(provider);
  }

  private resolveProvider(provider: string): IEmailService {
    switch (provider) {
      case EmailProvider.SENDGRID:
        return this.sendGridService;
      case EmailProvider.NODEMAILER:
        return this.nodemailerService;
      default:
        throw new Error(
          `Unknown email provider: "${provider}". Valid options: ${Object.values(EmailProvider).join(', ')}`,
        );
    }
  }
}
