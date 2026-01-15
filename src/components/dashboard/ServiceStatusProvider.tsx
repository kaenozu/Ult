'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkHealth } from '@/lib/api';
import { AlertCircle } from 'lucide-react';

interface ServiceStatusContextType {
    isOffline: boolean;
    retry: () => Promise<void>;
}

const ServiceStatusContext = createContext<ServiceStatusContextType>({
    isOffline: false,
    retry: async () => { },
});

export const useServiceStatus = () => useContext(ServiceStatusContext);

export const ServiceStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(false);

    const check = async () => {
        const online = await checkHealth();
        setIsOffline(!online);
    };

    useEffect(() => {
        // Initial check
        check();

        // Poll every 10 seconds
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ServiceStatusContext.Provider value={{ isOffline, retry: check }}>
            {isOffline && (
                <div className="bg-red-500/90 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                        サーバーとの接続が切断されました。データは古い可能性があります。
                        <button
                            onClick={check}
                            className="ml-2 underline hover:text-red-100"
                        >
                            再試行
                        </button>
                    </span>
                </div>
            )}
            {children}
        </ServiceStatusContext.Provider>
    );
};
