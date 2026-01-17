"use client";

import { SwipeNotificationDemo } from "@/components/demo/SwipeNotificationDemo";

export default function TestPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          In-App Swipe Notifications - Test
        </h1>
        <SwipeNotificationDemo />
      </div>
    </main>
  );
}
