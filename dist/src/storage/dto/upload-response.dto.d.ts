export declare class UploadResponseDto {
    key: string;
    url: string;
    provider: string;
    size: number;
    mimeType: string;
    originalName: string;
    constructor(partial: Partial<UploadResponseDto>);
}
