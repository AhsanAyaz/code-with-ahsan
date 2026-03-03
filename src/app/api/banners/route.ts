import { NextResponse } from "next/server";
import { getBanners } from "@/lib/content/contentProvider";

export async function GET() {
  try {
    const banners = await getBanners();
    return NextResponse.json({ success: banners.length > 0, banners });
  } catch {
    return NextResponse.json({ success: false, banners: [] }, { status: 500 });
  }
}
