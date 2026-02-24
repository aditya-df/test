export interface OAuthProviderConfig {
  name: string;
  fields: {
    key: string;
    label: string;
    required: boolean;
    type?: "text" | "password";
  }[];
  endpoints: {
    auth: string;
    token: string;
    refresh?: string;
  };
}

export const shopeeConfig: OAuthProviderConfig = {
  name: "Shopee",
  fields: [
    { key: "partnerId", label: "Partner ID", required: true },
    {
      key: "partnerKey",
      label: "Partner Key",
      required: true,
      type: "password",
    },
  ],
  endpoints: {
    auth: "https://partner.shopeemobile.com/api/v2/shop/auth_partner",
    token: "https://partner.shopeemobile.com/api/v2/auth/token/get",
    refresh: "https://partner.shopeemobile.com/api/v2/auth/access_token/get",
  },
};

export const tiktokConfig: OAuthProviderConfig = {
  name: "TikTok",
  fields: [
    { key: "clientKey", label: "Client Key", required: true },
    {
      key: "clientSecret",
      label: "Client Secret",
      required: true,
      type: "password",
    },
  ],
  endpoints: {
    auth: "https://www.tiktok.com/auth/authorize/",
    token: "https://open-api.tiktokglobalshop.com/api/v2/token/get",
    refresh: "https://open-api.tiktokglobalshop.com/api/v2/token/refresh",
  },
};

export const providers: Record<string, OAuthProviderConfig> = {
  shopee: shopeeConfig,
  tiktok: tiktokConfig,
};
