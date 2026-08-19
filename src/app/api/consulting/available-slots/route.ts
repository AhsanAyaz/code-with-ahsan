import { NextRequest, NextResponse } from "next/server";
import { getAvailableConsultingSlots } from "@/lib/consulting/availability";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-consulting-slots");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const durationStr = searchParams.get("duration");
    const timezone = searchParams.get("timezone") || "UTC";

    if (!startDate || !endDate || !durationStr) {
      return NextResponse.json(
        { error: "startDate, endDate, and duration parameters are required" },
        { status: 400 }
      );
    }

    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json({ error: "Invalid duration value" }, { status: 400 });
    }

    const slots = await getAvailableConsultingSlots({
      startDateStr: startDate,
      endDateStr: endDate,
      durationMinutes: duration,
      timezone,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    logger.error("Error fetching available consulting slots", { error });
    return NextResponse.json({ error: "Failed to fetch available slots" }, { status: 500 });
  }
}
