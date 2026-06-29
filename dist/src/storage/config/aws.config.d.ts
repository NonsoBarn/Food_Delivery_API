declare const _default: (() => {
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    s3: {
        bucket: string | undefined;
        publicUrl: string | undefined;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    s3: {
        bucket: string | undefined;
        publicUrl: string | undefined;
    };
}>;
export default _default;
