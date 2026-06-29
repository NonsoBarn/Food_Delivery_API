import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailFactoryService } from './mail-factory.service';
export declare class MailProcessor extends WorkerHost {
    private readonly factory;
    private readonly logger;
    constructor(factory: EmailFactoryService);
    process(job: Job): Promise<void>;
    onCompleted(job: Job): void;
    onFailed(job: Job, error: Error): void;
    onActive(job: Job): void;
}
