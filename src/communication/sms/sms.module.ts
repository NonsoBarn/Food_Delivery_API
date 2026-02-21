import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { smsConfig } from './config/sms.config';
import { twilioConfig } from './config/twilio.config';
import { SmsProviderConfig } from './entities/sms-provider-config.entity';
import { TwilioSmsService } from './providers/twilio-sms.service';
import { AfricasTalkingSmsService } from './providers/africas-talking-sms.service';
import { SmsFactoryService } from './sms-factory.service';
import { SmsService } from './sms.service';
import { SmsProcessor } from './sms.processor';

/**
 * SmsModule
 *
 * Same structure as MailModule — own queue, configs, entity, providers, factory, processor.
 * The 'sms' queue is separate from 'email' so each can be monitored and tuned independently.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'sms' }),
    ConfigModule.forFeature(smsConfig),
    ConfigModule.forFeature(twilioConfig),
    TypeOrmModule.forFeature([SmsProviderConfig]),
  ],
  providers: [
    TwilioSmsService,
    AfricasTalkingSmsService,
    SmsFactoryService,
    SmsService,
    SmsProcessor,
  ],
  exports: [SmsService, SmsFactoryService],
})
export class SmsModule {}
