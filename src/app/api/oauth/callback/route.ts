import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/config/db";
import { hashText } from "@/utils/utils";

// Rate limiting and retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterMax: 1000, // Random jitter up to 1 second
};

// Retry-able HTTP status codes
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

// Rate limiting tracker (in-memory - consider Redis for production)
const rateLimitTracker = new Map<
  string,
  { count: number; resetTime: number }
>();

// Utility function to add jitter to delay
function addJitter(delay: number, maxJitter: number): number {
  return delay + Math.random() * maxJitter;
}

// Utility function to calculate exponential backoff delay
function calculateDelay(
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

// Utility function to parse Retry-After header
function parseRetryAfter(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) return 0;

  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfterHeader);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return 0;
}

// Rate limiting check
function checkRateLimit(key: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const limit = rateLimitTracker.get(key);

  if (!limit || now > limit.resetTime) {
    // Reset or initialize rate limit
    rateLimitTracker.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return { allowed: true };
  }

  if (limit.count >= 10) {
    // Max 10 requests per minute per config
    return { allowed: false, resetTime: limit.resetTime };
  }

  limit.count++;
  return { allowed: true };
}

// Enhanced token request function with retry logic
async function makeTokenRequestWithRetry(
  url: string,
  headers: Record<string, string>,
  body: string,
  configId: string
): Promise<Response> {
  let lastError: Error | null = null;
  let finalBody: any = body;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Check rate limiting before making request
      const rateLimitCheck = checkRateLimit(configId);
      if (!rateLimitCheck.allowed) {
        const waitTime = rateLimitCheck.resetTime! - Date.now();
        console.log(
          `Rate limited for config ${configId}, waiting ${waitTime}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Create abort controller with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      console.log(
        `Token request attempt ${attempt + 1}/${
          RETRY_CONFIG.maxRetries + 1
        } for config ${configId}`
      );

      let method = "POST";
      if (url.includes("tiktok")) {
        method = "GET";
        finalBody = null;
      }

      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          "User-Agent": "KnowGen-OAuth-Client/1.0",
          Accept:
            "application/json, application/x-www-form-urlencoded, text/plain",
        },
        body: finalBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Success case
      if (response.ok) {
        console.log(`Token request successful on attempt ${attempt + 1}`);
        return response;
      }

      // Handle specific error cases
      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
        const delay =
          retryAfter ||
          calculateDelay(
            attempt,
            RETRY_CONFIG.baseDelay,
            RETRY_CONFIG.backoffMultiplier,
            RETRY_CONFIG.maxDelay
          );
        const jitteredDelay = addJitter(delay, RETRY_CONFIG.jitterMax);

        console.log(
          `Rate limited (429), waiting ${jitteredDelay}ms before retry ${
            attempt + 1
          }`
        );

        if (attempt < RETRY_CONFIG.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
          continue;
        }
      }

      // Check if status code is retryable
      if (
        RETRYABLE_STATUS_CODES.includes(response.status) &&
        attempt < RETRY_CONFIG.maxRetries
      ) {
        const delay = calculateDelay(
          attempt,
          RETRY_CONFIG.baseDelay,
          RETRY_CONFIG.backoffMultiplier,
          RETRY_CONFIG.maxDelay
        );
        const jitteredDelay = addJitter(delay, RETRY_CONFIG.jitterMax);

        console.log(
          `Retryable error ${
            response.status
          }, waiting ${jitteredDelay}ms before retry ${attempt + 1}`
        );
        await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        continue;
      }

      // Non-retryable error or max retries reached
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Token request attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // Don't retry on abort errors (timeout)
      if (lastError.name === "AbortError") {
        throw new Error("Token request timed out");
      }

      // Retry on network errors
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateDelay(
          attempt,
          RETRY_CONFIG.baseDelay,
          RETRY_CONFIG.backoffMultiplier,
          RETRY_CONFIG.maxDelay
        );
        const jitteredDelay = addJitter(delay, RETRY_CONFIG.jitterMax);

        console.log(
          `Network error, waiting ${jitteredDelay}ms before retry ${
            attempt + 1
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        continue;
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

/*
  This function exchanges the OAuth2 authorization code for an access token,
  handles provider-specific token request logic (TikTok, Shopee, etc.),
  retries on transient failures with exponential backoff and jitter,
  enforces rate-limiting per configuration, and securely stores the
  resulting tokens in the database as a new OAuth2Connection record.
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, state, ...data } = body;

    /*
      state is always provided by handleOAuth2Login 
      in src/components/ui/knowledge/api-configuration-knowledge.tsx 
    */
    const stateData = JSON.parse(state);

    // Get config from database
    const configData = await prisma.oauth2Config.findUnique({
      where: { id: stateData.config_id },
    });

    // validate if configData is complete
    if (!configData) {
      return NextResponse.json(
        { error: "OAuth configuration not found" },
        { status: 404 }
      );
    }
    if (!configData.accessTokenUrl) {
      return NextResponse.json(
        { error: "Incomplete OAuth configuration" },
        { status: 400 }
      );
    }

    let externalId = stateData.user_id;

    // Build token request
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const bodyParams = {
      grant_type: "authorization_code",
      code,
    };

    const queryParams = new URLSearchParams();

    // Process dynamic token request parameters
    if (
      Array.isArray(configData.tokenRequest) &&
      configData.tokenRequest.length
    ) {
      configData.tokenRequest.forEach((param: any) => {
        if (!param.key || !param.value) return;

        switch (param.send_in) {
          case "inHeader":
            headers[param.key] = param.value;
            break;
          case "inQuery":
            queryParams.append(param.key, param.value);
            break;
          case "inBody":
          default:
            Object.assign(bodyParams, { [param.key]: param.value });
            break;
        }
      });
    }

    /*
      TikTok requires auth_code in queryParams, and doesnt receive any bodyParams
      while Shopee requires code in bodyParams,
      Shopee also requires additional parameters in the URL.
    */
    if (configData.authUrl.includes("tiktok")) {
      // empty bodyParams
      Object.entries(bodyParams).forEach(([key]) => {
        delete (bodyParams as Record<string, any>)[key];
      });

      queryParams.append("auth_code", code);
    } else if (configData.authUrl.includes("shopee")) {
      // empty bodyParams
      Object.entries(bodyParams).forEach(([key]) => {
        delete (bodyParams as Record<string, any>)[key];
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const partnerId = (
        configData.authRequest as Array<{ key: string; value: string }>
      )?.find((param) => param?.key === "partner_id")?.value as string;
      const clientSecret = (
        configData.tokenRequest as Array<{ key: string; value: string }>
      )?.find((param) => param?.key === "partner_key")?.value;
      const apiPath = new URL(configData.accessTokenUrl).pathname;

      // Create the signing string: partner_id + api_path + timestamp
      const signingString = `${partnerId}${apiPath}${timestamp}`;

      try {
        const signature = await hashText(signingString, clientSecret || "");

        const objectParams = {
          timestamp,
          sign: signature,
        };

        queryParams.delete("partner_key");
        Object.entries(objectParams).forEach(([key, value]) => {
          queryParams.append(key, String(value));
        });

        const objectBody = {
          code,
          partner_id: parseInt(partnerId),
          shop_id: parseInt(data.shop_id),
        };

        Object.entries(objectBody).forEach(([key, value]) => {
          Object.assign(bodyParams, { [key]: value });
        });

        headers["Content-Type"] = "application/json";
        externalId = data.shop_id;
      } catch (error) {
        console.error("Error generating Shopee OAuth signature:", error);
        throw new Error("Failed to generate OAuth signature for Shopee");
      }
    }

    // Build final URL
    let finalUrl = configData.accessTokenUrl;
    if (queryParams.toString()) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + queryParams.toString();
    }

    // Get token access with retry logic
    let tokenResponse: Response;
    try {
      tokenResponse = await makeTokenRequestWithRetry(
        finalUrl,
        headers,
        JSON.stringify(bodyParams),
        configData.id
      );
    } catch (error) {
      console.error("Token request failed after all retries:", error);
      return NextResponse.json(
        {
          error: "Failed to exchange authorization code for token",
          details: error instanceof Error ? error.message : "Unknown error",
          retryable: true,
        },
        { status: 503 } // Service Unavailable
      );
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token request failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        url: finalUrl.replace(/client_secret=[^&]+/, "client_secret=***"),
      });

      // Return specific error for rate limiting
      if (tokenResponse.status === 429) {
        const retryAfter = tokenResponse.headers.get("Retry-After");
        return NextResponse.json(
          {
            error: "Rate limited by OAuth provider",
            retryAfter: retryAfter ? parseInt(retryAfter) : 60,
            retryable: true,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to exchange authorization code for token",
          status: tokenResponse.status,
          retryable: RETRYABLE_STATUS_CODES.includes(tokenResponse.status),
        },
        { status: 400 }
      );
    }

    const responseData = await tokenResponse.json();
    const tokenData: any = responseData?.data || responseData;
    if (responseData?.error) {
      return NextResponse.json({ error: responseData.error }, { status: 400 });
    }

    // Validate token response
    if (!tokenData.access_token) {
      console.error("No access token in response:", Object.keys(tokenData));
      return NextResponse.json(
        { error: "No access token received" },
        { status: 400 }
      );
    }

    // Store tokens securely in database by creating OAuth2Connection
    console.log({ responseData });
    let connection: any = null;
    try {
      const accessTokenExpireIn =
        tokenData?.access_token_expire_in || tokenData?.expire_in;
      // Calculate expiration dates
      const accessExpiresAt = new Date(accessTokenExpireIn * 1000);
      const refreshExpiresAt = tokenData.refresh_token_expire_in
        ? new Date(tokenData.refresh_token_expire_in * 1000)
        : null;

      // Prepare connection data
      const connectionData = {
        name: configData.name,
        configId: configData.id,
        externalId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        access_expires_at: accessExpiresAt,
        refresh_expires_at: refreshExpiresAt,
        binding_created_at: new Date(),
        binding_expired_at: null, // Set based on your business logic
        headerPrefix: tokenData?.token_type || null,
      };

      // Create new OAuth2 connection
      connection = await prisma.oauth2Connection.create({
        data: {
          name: connectionData.name,
          configId: connectionData.configId,
          externalId: connectionData.externalId,
          accessToken: connectionData.accessToken,
          refreshToken: connectionData.refreshToken,
          access_expires_at: connectionData.access_expires_at,
          refresh_expires_at: connectionData.refresh_expires_at,
          binding_created_at: connectionData.binding_created_at,
          binding_expired_at: connectionData.binding_expired_at,
          headerPrefix: connectionData.headerPrefix,
        },
        include: {
          config: {
            select: {
              id: true,
              name: true,
              grantType: true,
              callbackUrl: true,
              authUrl: true,
              accessTokenUrl: true,
              clientId: true,
              scope: true,
              clientAuth: true,
            },
          },
        },
      });

      console.log(
        `OAuth2Connection created successfully with ID: ${connection.id}`
      );
    } catch (connectionError) {
      console.error("Error creating OAuth2Connection:", connectionError);
      return NextResponse.json(
        { error: "Failed to store OAuth tokens" },
        { status: 500 }
      );
    }

    console.log(`OAuth token exchange successful for config ${configData.id}`);

    return NextResponse.json({
      success: true,
      message: "OAuth token obtained and stored successfully",
      connectionId: connection?.id,
      expires_in: tokenData.access_token_expire_in,
      token_type: tokenData?.token_type || null,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
