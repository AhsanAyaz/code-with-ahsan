import { NextResponse } from "next/server";
import { CONSULTING_PACKAGES } from "@/lib/consulting/constants";

export async function GET() {
  return NextResponse.json({
    packages: CONSULTING_PACKAGES,
  });
}
