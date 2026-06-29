import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SmsFactoryService } from './sms-factory.service';
export declare class SmsProcessor extends WorkerHost {
    private readonly factory;
    private readonly logger;
    constructor(factory: SmsFactoryService);
    process(job: Job): Promise<void>;
    onCompleted(job: Job): void;
    onFailed(job: Job, error: Error): void;
}
