import { AppService } from './app.service';
import { CartCleanupJob } from './scheduled-jobs/jobs/cart-cleanup.job';
import { ReportsJob } from './scheduled-jobs/jobs/reports.job';
import { ReminderEmailsJob } from './scheduled-jobs/jobs/reminder-emails.job';
export declare class AppController {
    private readonly appService;
    private readonly cartJob;
    private readonly reportsJob;
    private readonly reminderJob;
    constructor(appService: AppService, cartJob: CartCleanupJob, reportsJob: ReportsJob, reminderJob: ReminderEmailsJob);
    getHello(): string;
    health(): {
        status: string;
        timestamp: string;
    };
    runCartCleanup(): Promise<void>;
    runDailyReport(): Promise<void>;
    runWeeklyReport(): Promise<void>;
    runReminders(): Promise<void>;
}
