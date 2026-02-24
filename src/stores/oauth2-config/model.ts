import { DataRequestRestApi } from "../knowledge-new/model";

export class Data {
  id?: string;
  name?: string;
  grantType?: string;
  callbackUrl?: string;
  authUrl?: string;
  accessTokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  state?: string;
  clientAuth?: string;
  refreshUrl?: string;
  authRequest?: DataRequestRestApi[];
  tokenRequest?: DataRequestRestApi[];
  refreshRequest?: DataRequestRestApi[];
}
