export declare const API_VERSIONS: {
    readonly V1: "1";
    readonly V2: "2";
};
export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];
