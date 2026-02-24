export class Data {
  id!: string;
  name?: string;
  headerPrefix?: string;
  configId!: string;
  externalId!: string;
  accessToken!: string;
  refreshToken!: string;
  accessExpiresAt?: Date | null;
  refreshExpiresAt?: Date | null;
  bindingCreatedAt?: Date | null;
  bindingExpiredAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  config?: {
    id: string;
    name: string;
    grantType: string;
    callbackUrl: string;
    authUrl: string;
    accessTokenUrl: string;
    clientId: string;
    scope: string;
    clientAuth: string;
    clientSecret: string;
  };
}
