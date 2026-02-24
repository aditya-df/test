import crypto from "crypto";
import { getParamValueFromSources, hashText } from "./utils";
import { addMinutes, Day, endOfWeek, format, startOfWeek } from "date-fns";

export const TEMPLATE_REGEX = /\{\{(.*?)\}\}/g;
export const FUNCTION_LIBRARY = {
  timestamp: {
    label: "Timestamp",
    description: "Returns the current Unix timestamp.",
    preview: "{{ timestamp() }}",
  },
  generateSignTiktok: {
    label: "Generate Sign TikTok",
    description: "Generates an API signature using app_key and secret.",
    preview: "{{ generateSignTiktok(app_secret) }}",
  },
  generateSignShopee: {
    label: "Generate Sign Shopee",
    description: "Generates an API signature using partnerId and clientSecret.",
    preview:
      "{{ generateSignShopee(partner_id, externalId, accessToken, partner_key) }}",
  },
  getAccessToken: {
    label: "Get Access Token",
    description: "Retrieves the access token from database.",
    preview: "{{ getValue(accessToken) }}",
  },
  getShopIdShopee: {
    label: "Get Shop ID Shopee",
    description: "Retrieves the shop_id from database.",
    preview: "{{ getValue(externalId) }}",
  },
  getShopChiperTiktok: {
    label: "Get Shop Chiper TikTok",
    description: "Retrieves the shop_chiper from database.",
    preview: "{{ getValue(externalId) }}",
  },
  getDate: {
    label: "Get Date",
    description: `Returns a formatted date string based on an optional base date and minute offset.
      Args: 
        baseDate (Date|string, optional) - Defaults to now, 
        offsetMinutes (number, optional) - Defaults to 0,
        outputFormat  (string, optional) - e.g., 'dd-MM-yyyy', defaults to 'dd-MM-yyyy
      Example: getDate({ baseDate:'2023-01-01', offsetMinutes:120, outputFormat:'yyyy-MM-dd' })`,
    preview: "{{ getDate({ }) }}",
  },
  getBoundaryOfPeriod: {
    label: "Get Boundary of Period",
    description: `Returns the start or end boundary of the given period ('week', 'month', 'quarter', 'year') from an optional base date.
    Args:
    
      period (string) - 'week' | 'month' | 'quarter' | 'year'
      baseDate (Date|string, optional) - Defaults to now. e.g '2023-01-01'
      position (string, optional) - 'start' | 'end' (defaults to 'start')
      weekStartsOn (Day|number, optional) - 0=Sunday, 1=Monday, etc. (for 'week')
      outputFormat (string, optional) - e.g., 'yyyy-MM-dd' or 'timestamp' (defaults to 'yyyy-MM-dd')
    Example: getBoundaryOfPeriod({ period:'month', position:'start' })`,
    preview: "{{ getBoundaryOfPeriod({ period:'month', position:'start' }) }}",
  },
};

export const functionRegistry = {
  getValue: (obj: any, returnObject = false) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestOption: _requestOption, ...data } = obj;
    return returnObject ? data : data[Object.keys(data)[0]];
  },
  timestamp: (obj: any) => {
    const minutes = Number(functionRegistry.getValue(obj)) || 0;
    const date = Math.floor((Date.now() + minutes * 60 * 1000) / 1000);
    return date;
  },
  generateSignTiktok: (requestOption: any) =>
    generateSignTiktok({ requestOption }),
  generateSignShopee: (requestOption: any) =>
    generateSignShopee({ requestOption }),
  getDate: (obj: any) => {
    const parameter: {
      baseDate?: Date | string;
      offsetMinutes?: number;
      outputFormat?: string;
    } = functionRegistry.getValue(obj, true) || {};

    const {
      baseDate,
      offsetMinutes = 0,
      outputFormat = "yyyy-MM-dd",
    } = parameter;

    const date = baseDate ? new Date(baseDate) : new Date();
    const newDate = addMinutes(date, offsetMinutes);
    return format(newDate, outputFormat);
  },
  getBoundaryOfPeriod(obj: any) {
    const parameter: {
      period: "month" | "week" | "quarter" | "year";
      baseDate?: Date | string;
      outputFormat?: string; // contoh: "yyyy-MM-dd", "timestamp"
      position?: "start" | "end"; // "start" atau "end"
      weekStartsOn?: Day; // 0: Minggu, 1: Senin, dst.
    } = functionRegistry.getValue(obj, true) || {};

    const {
      period,
      baseDate = new Date(),
      outputFormat = "yyyy-MM-dd",
      position = "start",
      weekStartsOn = 0, // default Minggu, ubah ke 1 kalau mau Senin
    } = parameter;

    let date = new Date(baseDate);

    switch (period) {
      case "week":
        if (position === "start") {
          date = startOfWeek(date, { weekStartsOn });
          date.setHours(0, 0, 0, 0);
        } else {
          date = endOfWeek(date, { weekStartsOn });
          date.setHours(23, 59, 59, 999);
        }
        break;
      case "month":
        if (position === "start") {
          date.setDate(1);
          date.setHours(0, 0, 0, 0);
        } else {
          date.setMonth(date.getMonth() + 1, 0);
          date.setHours(23, 59, 59, 999);
        }
        break;
      case "quarter":
        if (position === "start") {
          date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
          date.setHours(0, 0, 0, 0);
        } else {
          date.setMonth(Math.floor(date.getMonth() / 3) * 3 + 3, 0);
          date.setHours(23, 59, 59, 999);
        }
        break;
      case "year":
        if (position === "start") {
          date.setMonth(0, 1);
          date.setHours(0, 0, 0, 0);
        } else {
          date.setMonth(12, 0);
          date.setHours(23, 59, 59, 999);
        }
        break;
      default:
        throw new Error("Invalid period");
    }

    if (outputFormat === "timestamp") {
      return Math.floor(date.getTime() / 1000);
    } else {
      return format(date, outputFormat);
    }
  },
};

export function resolveDynamicValue(expr: string) {
  const match = expr.match(/^(\w+)\((.*)\)$/);
  if (!match) return expr;

  const [, fnName, argString] = match;
  const fn = (functionRegistry as Record<string, (...args: any[]) => any>)[
    fnName
  ];
  if (!fn) throw new Error(`Unknown function: ${fnName}`);

  const args = argString
    ? argString.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    : [];

  return fn(...args);
}

export interface KeyValueObject {
  key: string;
  value: string;
}

export async function resolveDynamicFunction(
  value: string,
  requestOption?: any,
  sources?: any
) {
  const matches = [...value.toString().matchAll(TEMPLATE_REGEX)];

  let result = value;

  for (const match of matches) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_full, expr] = match;
    const fnMatch = expr.trim().match(/^(\w+)\((.*)\)$/);
    if (!fnMatch) continue;

    const [, fnName, argString] = fnMatch;
    const fn = (functionRegistry as Record<string, (...args: any[]) => any>)[
      fnName
    ];
    if (!fn) throw new Error(`Unknown function: ${fnName}`);

    let args, parameter;
    if (argString.toString().includes("{")) {
      const jsonLike = argString
        .replace(/\{\s+/g, "{") // hapus spasi setelah {
        .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // tambahkan kutip di key
        .replace(/'/g, '"');
      parameter = JSON.parse(jsonLike);
    } else {
      args = argString
        ? argString.split(",").map((s: string) => {
            const param = s.trim().replace(/^['"]|['"]$/g, "");
            const value = getParamValueFromSources(param, sources);
            return { [param]: value || param };
          })
        : [];
      parameter = { ...Object.assign({}, ...args) };
    }

    const resolved = await fn({
      ...parameter,
      requestOption,
    });
    result = resolved;
  }

  return result;
}

/* 
  sign: encrypts HMAC-SHA256 signature using 
  parameters defined at knowledge-creation time
*/
const excludeKeys = ["access_token", "sign"] as const;
export const generateSignTiktok = (obj: any) => {
  const { requestOption, app_secret } = obj.requestOption;
  let signString = "";
  // step1: Extract all query parameters excluding sign and access_token. Reorder the parameter keys in alphabetical order:
  const params = requestOption.qs || {};

  //  resolveDynamicFunction is for resolve params function
  const sortedParams = Object.keys(params)
    .filter((key) => !excludeKeys.includes(key as any))
    .sort()
    .map((key) => ({
      key,
      value: params[key],
    }));

  //step2: Concatenate all the parameters in the format {key}{value}:
  const paramString = sortedParams
    .map(({ key, value }) => `${key}${value}`)
    .join("");
  signString += paramString;

  //step3: Append the string from Step 2 to the API request path:
  const pathname = new URL(requestOption.uri || "").pathname;

  signString = `${pathname}${paramString}`;

  //step4: If the request header content-type is not multipart/form-data, append the API request body to the string from Step 3:
  if (
    requestOption.headers?.["content-type"] !== "multipart/form-data" &&
    requestOption.body &&
    Object.keys(requestOption.body).length
  ) {
    const body = JSON.stringify(requestOption.body);
    signString += body;
  }

  //step5: Wrap the string generated in Step 4 with the app_secret:
  signString = `${app_secret}${signString}${app_secret}`;

  //step6: Encode your wrapped string using HMAC-SHA256:
  const hmac = crypto.createHmac("sha256", app_secret);
  hmac.update(signString);
  const sign = hmac.digest("hex");

  return sign;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _handleShopChiper(
  app_key: string,
  timestamp: string,
  app_secret: string,
  url: string,
  requestHeaders: any,
  queryParamsRestAPI: any[]
) {
  let response;
  try {
    const urlParams = new URLSearchParams();
    Object.entries({
      app_key,
      timestamp,
      sign: generateSignTiktok({
        requestOption: {
          qs: {
            app_key,
            timestamp,
          },
        },
        app_secret,
      }),
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlParams.append(key, String(value));
      }
    });

    let finalUrl = url;
    if (urlParams.toString()) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + urlParams.toString();
    }
    const fetchOptions: any = {
      method: "GET",
      headers: requestHeaders,
    };
    response = await fetch(finalUrl, fetchOptions);
  } catch (error) {
    console.error("Error generating TikTok OAuth signature:", error);
    throw new Error("Failed to generate OAuth signature for TikTok");
  }
  if (response?.ok) {
    const json = await response.json();
    queryParamsRestAPI.push({
      key: "shop_cipher",
      value: json?.data?.shops?.[0]?.cipher,
    });
  }
}

export const generateSignShopee = async (obj: any) => {
  const { requestOption, partner_id, partner_key, accessToken, externalId } =
    obj.requestOption;

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = new URL(requestOption.uri || "").pathname;
  // Create the signing string: partner_id + api_path + timestamp
  const signingString = `${partner_id}${apiPath}${timestamp}${accessToken}${externalId}`;

  const signature = await hashText(signingString, partner_key || "");
  return signature;
};
