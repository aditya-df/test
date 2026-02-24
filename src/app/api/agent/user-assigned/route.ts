import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/utils/auth-utils-server";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("session from/api/agent/user-assigned", session)

    const backendToken = session.user?.backendToken;

    if (!backendToken) {
      console.error("Backend token is missing from session");
      console.error("Session user object:", JSON.stringify(session.user, null, 2));
      console.error("Session provider:", session.user?.provider);
      console.error("Session ID:", session.user?.id);
      console.error("Environment:", process.env.NODE_ENV);
      console.error("Auth Service URL:", process.env.NEXT_PUBLIC_AUTH_SERVICE_URL);
      
      // Additional debugging for production
      if (process.env.NODE_ENV === 'production') {
        console.error("PRODUCTION ERROR: Backend token missing. This suggests session callback failed.");
        console.error("Check if NEXT_PUBLIC_AUTH_SERVICE_URL is accessible from production environment.");
        console.error("Check network connectivity and firewall rules.");
      }
      
      return NextResponse.json(
        { 
          error: "Authentication token not available",
          details: process.env.NODE_ENV === 'development' ? {
            provider: session.user?.provider,
            userId: session.user?.id,
            environment: process.env.NODE_ENV
          } : undefined
        },
        { status: 401 }
      );
    }
    // console.log("backend token from /api/agent/use asigned", backendToken)
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/agent?page=${offset}&page_size=${limit}&is_table=false`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
      }
    );

    // Check if response is ok
    if (!response.ok) {
      console.error(`Backend API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend service error: ${response.status}` },
        { status: response.status }
      );
    }

    // Check content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Backend returned non-JSON response:", contentType);
      return NextResponse.json(
        { error: "Invalid response format from backend service" },
        { status: 502 }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON response from backend service" },
        { status: 502 }
      );
    }

    // Check if response is valid and has expected structure
    if (!data || !data.data || !data.data.search_options) {
      console.error("Invalid response structure from backend:", data);
      return NextResponse.json(
        { error: "Invalid response from backend service" },
        { status: 502 }
      );
    }
    
    const agents = data.data?.founds || [];
    const page = data.data.search_options.page || 0;
    const pageSize = data.data.search_options.page_size || limit;
    const total = data.data.search_options.total_count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: agents,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching user agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
