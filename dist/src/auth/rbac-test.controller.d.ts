import type { RequestUser } from './interfaces/jwt-payload.interface';
export declare class RbacTestController {
    publicRoute(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    customerOnly(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    vendorOnly(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    riderOnly(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    adminOnly(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    vendorOrAdmin(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
    notCustomer(user: RequestUser): {
        message: string;
        user: RequestUser;
    };
}
