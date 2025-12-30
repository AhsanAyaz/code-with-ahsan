import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, source } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required" },
        { status: 400 }
      );
    }

    const WEBHOOK_URL =
      "https://n8n.codewithahsan.dev/webhook/book-interest-signup";

    const params = new URLSearchParams({
      name,
      email,
      source: source || "website-book-card",
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(`${WEBHOOK_URL}?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: "Interest registered!",
    });
  } catch (error) {
    console.error("Error submitting interest:", error);
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
