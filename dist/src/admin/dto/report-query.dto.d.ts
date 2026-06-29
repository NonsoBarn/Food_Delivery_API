export declare enum ReportPeriod {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly"
}
export declare class ReportQueryDto {
    period?: ReportPeriod;
    startDate?: string;
    endDate?: string;
}
