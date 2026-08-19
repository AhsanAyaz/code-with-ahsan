import { NextResponse } from "next/server";
import { getConsultingSettings } from "@/lib/consulting/config";

export async function GET() {
  const settings = await getConsultingSettings();
  return NextResponse.json({
    packages: settings.packages,
  });
}
