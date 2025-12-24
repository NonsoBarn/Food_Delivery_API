export class UploadResponseDto {
  key: string;
  url: string;
  provider: string;
  size: number;
  mimeType: string;
  originalName: string;

  constructor(partial: Partial<UploadResponseDto>) {
    Object.assign(this, partial);
  }
}
