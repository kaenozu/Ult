'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { ScreenLabel } from '@/app/components/ScreenLabel';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false }) as React.ComponentType<{ url: string }>;

export default function ApiDocPage() {
  return (
    <div className="min-h-screen bg-white">
      <ScreenLabel label="API ドキュメント / API Documentation" className="!bg-white/90 !text-gray-700 !border-gray-300" />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">ULT Trading Platform API Documentation</h1>
        <SwaggerUI url="/api/openapi.json" />
      </div>
    </div>
  );
}
