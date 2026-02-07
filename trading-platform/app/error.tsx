'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useTranslations } from '@/app/i18n/provider';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 p-4">
            <div className="flex max-w-md flex-col items-center text-center p-8 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
                <div className="p-3 bg-red-500/10 rounded-full mb-4">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('errorPage.title')}</h2>
                <p className="text-gray-400 mb-6">
                    {t('errorPage.description')}
                </p>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 w-full mb-6 overflow-hidden">
                    <p className="text-xs text-red-400 font-mono break-all text-left">
                        {error.message || t('errorPage.unknownError')}
                    </p>
                    {error.digest && (
                        <p className="text-[10px] text-gray-500 font-mono mt-1 text-left">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>
                <button
                    onClick={reset}
                    className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-blue-500/20"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    {t('errorPage.tryAgain')}
                </button>
            </div>
        </div>
    );
}
