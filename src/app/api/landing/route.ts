import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_API_BASE_URL}/api/landing${search ? `?${search}` : ""}`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "application/json";
    const bodyText = await response.text();

    return new NextResponse(bodyText, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Landing upstream unavailable",
        message: error instanceof Error ? error.message : "Unknown upstream error",
      },
      { status: 502 }
    );
  }
}
