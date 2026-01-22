"use client";

import dynamic from "next/dynamic";

const InteractiveStockGalaxy = dynamic(
  () => import("@/components/features/xr/InteractiveStockGalaxy"),
  { ssr: false }
);

export default function WebXRPage() {
  return (
    <div className="w-full h-screen">
      <InteractiveStockGalaxy />
    </div>
  );
}
