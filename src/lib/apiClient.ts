import nextAuthToken from "./nextauth-token";

const logOnDev = (message: string, log?: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, log);
  }
};

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestInit;
  url: string;
}

interface ApiError extends Error {
  response?: {
    data?: any;
    status?: number;
    headers?: Headers;
  };
  config?: RequestInit;
}

const apiClient = {
  async request<T = any>(
    url: string,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith("http")
      ? url
      : `${process.env.NEXT_PUBLIC_BACKEND_API_URL}${url}`;

    // Default headers
    const headers = new Headers(config.headers || {});

    // Add authorization token with NextAuth integration
    try {
      // First try to get token from NextAuth session
      const nextAuthAccessToken = await nextAuthToken.getToken();

      if (nextAuthAccessToken) {
        headers.set("Authorization", `Bearer ${nextAuthAccessToken}`);
        logOnDev("🔐 Using NextAuth token for authentication");
      }
    } catch (error) {
      console.error("Error retrieving authentication token:", error);
    }

    // Set content type if not specified and method is not GET
    if (
      !headers.has("Content-Type") &&
      config.method !== "GET" &&
      config.body
    ) {
      // Don't set Content-Type for FormData - browser will set it automatically with boundary
      if (!(config.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
    }

    // Prepare final request config
    const requestConfig: RequestInit = {
      ...config,
      headers,
    };

    // Log request in development
    const method = requestConfig.method || "GET";
    logOnDev(`🚀 [${method.toUpperCase()}] ${url} | Request`, requestConfig);

    try {
      const response = await fetch(fullUrl, requestConfig);

      // Parse response data
      let data: T;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      // Create response object similar to axios format
      const responseObj: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: requestConfig,
        url: fullUrl,
      };

      // Log successful response in development
      logOnDev(
        `✨ [${method.toUpperCase()}] ${url} | Response ${response.status}`,
        responseObj,
      );

      // Handle error status codes
      if (!response.ok) {
        // Handle authentication errors (401 Unauthorized)
        if (response.status === 401) {
          logOnDev(
            "🚨 Authentication failed - clearing tokens and redirecting",
          );

          // Clear both NextAuth session and manual tokens
          // token.removeToken(ACCESS_TOKEN_KEY);

          // For NextAuth, we should redirect to sign-in
          if (typeof window !== "undefined") {
            // Import signOut dynamically to avoid SSR issues
            // const { signOut } = await import("next-auth/react");
            // await signOut({ callbackUrl: "/login" });
          }
        }

        // Handle rate limiting (429 Too Many Requests)
        if (response.status === 429) {
          logOnDev("🚨 Rate limit exceeded - clearing tokens and reloading");
          // token.removeToken(ACCESS_TOKEN_KEY);

          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }

        const error: ApiError = new Error(response.statusText);
        error.response = {
          data,
          status: response.status,
          headers: response.headers,
        };
        error.config = requestConfig;

        // Log error in development
        logOnDev(
          `🚨 [${method.toUpperCase()}] ${url} | Error ${response.status} ${
            (data as any)?.message || ""
          } | ${response.statusText}`,
          error,
        );

        throw error;
      }

      return responseObj;
    } catch (error) {
      const apiError = error as ApiError;

      // Log error in development
      logOnDev(
        `🚨 [${method.toUpperCase()}] ${url} | Error ${
          apiError.response?.status || "unknown"
        } | ${apiError.message}`,
        apiError,
      );

      throw apiError;
    }
  },

  // Convenience methods
  async get<T = any>(
    url: string,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "GET" });
  },

  async post<T = any>(
    url: string,
    data?: any,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    let body: string | FormData | undefined;

    // Handle different data types
    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      body = JSON.stringify(data);
    }

    return this.request<T>(url, {
      ...config,
      method: "POST",
      body,
    });
  },

  // Dedicated method for form-data requests with file uploads
  async postFormData<T = any>(
    url: string,
    data: Record<string, any> | FormData,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    let formData: FormData;

    if (data instanceof FormData) {
      formData = data;
    } else {
      // Convert object to FormData
      formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value instanceof FileList) {
          Array.from(value).forEach((file, index) => {
            formData.append(`${key}[${index}]`, file);
          });
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item instanceof File) {
              formData.append(`${key}[${index}]`, item);
            } else {
              formData.append(`${key}[${index}]`, String(item));
            }
          });
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }

    return this.request<T>(url, {
      ...config,
      method: "POST",
      body: formData,
    });
  },

  async put<T = any>(
    url: string,
    data?: any,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    let body: string | FormData | undefined;

    // Handle different data types
    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      body = JSON.stringify(data);
    }

    return this.request<T>(url, {
      ...config,
      method: "PUT",
      body,
    });
  },

  async delete<T = any>(
    url: string,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "DELETE" });
  },

  async patch<T = any>(
    url: string,
    data?: any,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    let body: string | FormData | undefined;

    // Handle different data types
    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      body = JSON.stringify(data);
    }

    return this.request<T>(url, {
      ...config,
      method: "PATCH",
      body,
    });
  },
};

export default apiClient;
