"use client";

import dynamic from 'next/dynamic';

const QuantumTradingOracle = dynamic(
    () => import("@/components/features/xr/QuantumTradingOracle"),
    { ssr: false }
);

export default function QuantumOracleClient() {
    return <QuantumTradingOracle />;
}
