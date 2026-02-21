import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { CommunicationEventsListener } from './listeners/communication-events.listener';

import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';

/**
 * CommunicationModule
 *
 * The parent module for all outbound communication channels:
 *   - Email (via MailModule)
 *   - SMS   (via SmsModule)
 *
 * WebSocket (src/notifications/) stays separate as per the architecture decision.
 *
 * KEY LEARNING: Why a parent module?
 * ====================================
 * CommunicationModule groups related sub-modules under one import in AppModule.
 * AppModule only needs to know about CommunicationModule — not MailModule or SmsModule.
 * This follows the principle of "high cohesion, low coupling."
 *
 * The listener lives here (not in MailModule or SmsModule) because it depends on BOTH.
 * A listener that queues email AND SMS can't belong to just one of those modules.
 *
 * TypeOrmModule.forFeature([CustomerProfile, VendorProfile, Order])
 * ──────────────────────────────────────────────────────────────────
 * The listener needs to read customer + vendor + order data.
 * We register those repositories here so CommunicationEventsListener can inject them.
 * This does NOT create new DB connections — TypeORM reuses the existing pool.
 */
@Module({
  imports: [
    MailModule,
    SmsModule,

    // Repositories the listener needs to look up emails, phones, vendor names
    TypeOrmModule.forFeature([CustomerProfile, VendorProfile, Order]),
  ],
  providers: [CommunicationEventsListener],
  exports: [MailModule, SmsModule],
})
export class CommunicationModule {}
