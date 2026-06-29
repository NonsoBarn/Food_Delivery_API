export declare enum RevenuePeriod {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly"
}
export declare class RevenueQueryDto {
    period?: RevenuePeriod;
    startDate?: string;
    endDate?: string;
}
