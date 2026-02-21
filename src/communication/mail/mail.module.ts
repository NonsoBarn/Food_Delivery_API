import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { mailConfig } from './config/mail.config';
import { sendgridConfig } from './config/sendgrid.config';
import { EmailProviderConfig } from './entities/email-provider-config.entity';
import { SendGridEmailService } from './providers/sendgrid-email.service';
import { NodemailerEmailService } from './providers/nodemailer-email.service';
import { EmailFactoryService } from './mail-factory.service';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

/**
 * MailModule
 *
 * KEY LEARNING: Module composition
 * ==================================
 * This module is responsible for everything email-related.
 * It declares its own queue, configs, entity, providers, factory, and processor.
 * CommunicationModule imports it and re-exports MailService so the listener can use it.
 *
 * BullModule.registerQueue({ name: 'email' })
 * ─────────────────────────────────────────────
 * Registers the 'email' queue under the shared BullMQ Redis connection
 * (defined in AppModule via BullModule.forRoot).
 * After this, you can @InjectQueue('email') anywhere in this module.
 *
 * ConfigModule.forFeature(mailConfig) + ConfigModule.forFeature(sendgridConfig)
 * ────────────────────────────────────────────────────────────────────────────
 * Registers config namespaces ('mail' and 'sendgrid') scoped to this module.
 * Same pattern as PaymentsModule using ConfigModule.forFeature(stripeConfig).
 *
 * TypeOrmModule.forFeature([EmailProviderConfig])
 * ─────────────────────────────────────────────────
 * Registers the EmailProviderConfig entity repository.
 * Required so EmailFactoryService can @InjectRepository(EmailProviderConfig).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    ConfigModule.forFeature(mailConfig),
    ConfigModule.forFeature(sendgridConfig),
    TypeOrmModule.forFeature([EmailProviderConfig]),
  ],
  providers: [
    SendGridEmailService,
    NodemailerEmailService,
    EmailFactoryService,
    MailService,
    MailProcessor,
  ],
  exports: [
    // Export MailService so CommunicationEventsListener can inject it
    MailService,
    // Export factory in case admin controllers or other modules need it
    EmailFactoryService,
  ],
})
export class MailModule {}
