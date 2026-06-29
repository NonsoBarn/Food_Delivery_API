"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadResponseDto = void 0;
class UploadResponseDto {
    key;
    url;
    provider;
    size;
    mimeType;
    originalName;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.UploadResponseDto = UploadResponseDto;
//# sourceMappingURL=upload-response.dto.js.map