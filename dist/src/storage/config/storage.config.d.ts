declare const _default: (() => {
    provider: string;
    maxFileSize: number;
    allowedMimeTypes: {
        images: string[];
        documents: string[];
        all: string[];
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    provider: string;
    maxFileSize: number;
    allowedMimeTypes: {
        images: string[];
        documents: string[];
        all: string[];
    };
}>;
export default _default;
