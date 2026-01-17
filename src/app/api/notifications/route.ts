import { NextRequest, NextResponse } from "next/server";

// Simple notification processor for API routes
function processNotification(
  type: string,
  title: string,
  message: string,
  severity: string,
  metadata?: any,
): boolean {
  console.log(`🔔 In-App Notification:`, {
    type,
    title,
    message,
    severity,
    metadata,
  });

  switch (type) {
    case "trade":
      console.log(`💹 Trade: ${title} - ${message}`);
      break;
    case "price_alert":
      console.log(`📈 Price Alert: ${title} - ${message}`);
      break;
    case "portfolio":
      console.log(`💼 Portfolio: ${title} - ${message}`);
      break;
    case "system":
      console.log(`⚙️ System: ${title} - ${message}`);
      break;
    default:
      console.log(`📢 Notification: ${title} - ${message}`);
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const {
      type,
      title,
      message,
      severity = "info",
      metadata,
    } = await request.json();

    // Process the notification using our in-app system
    const success = processNotification(
      type,
      title,
      message,
      severity,
      metadata,
    );

    return NextResponse.json({
      success,
      message: "In-App notification processed",
      type,
      title,
      severity,
    });
  } catch (error) {
    console.error("Notification API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process notification" },
      { status: 500 },
    );
  }
}
