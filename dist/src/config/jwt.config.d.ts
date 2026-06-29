interface JwtConfig {
    secret: string;
    accessTokenExpiration: string;
    refreshTokenSecret: string;
    refreshTokenExpiration: string;
}
declare const _default: (() => JwtConfig) & import("@nestjs/config").ConfigFactoryKeyHost<JwtConfig>;
export default _default;
