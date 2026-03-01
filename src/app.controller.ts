import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CartCleanupJob } from './scheduled-jobs/jobs/cart-cleanup.job';
import { ReportsJob } from './scheduled-jobs/jobs/reports.job';
import { ReminderEmailsJob } from './scheduled-jobs/jobs/reminder-emails.job';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cartJob: CartCleanupJob,
    private readonly reportsJob: ReportsJob,
    private readonly reminderJob: ReminderEmailsJob,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ── Dev-only job trigger endpoints (Method B from testing guide) ──

  @Post('dev/jobs/cart-cleanup')
  runCartCleanup() {
    return this.cartJob.reportCartStats();
  }

  @Post('dev/jobs/daily-report')
  runDailyReport() {
    return this.reportsJob.generateDailyReport();
  }

  @Post('dev/jobs/weekly-report')
  runWeeklyReport() {
    return this.reportsJob.generateWeeklyReport();
  }

  @Post('dev/jobs/cart-reminders')
  runReminders() {
    return this.reminderJob.sendAbandonedCartReminders();
  }
}
