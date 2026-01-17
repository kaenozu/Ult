export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-transparent pointer-events-none">
            <div className="glass-panel p-8 rounded-full animate-pulse-slow flex flex-col items-center justify-center relative w-48 h-48">
                {/* Core Reactor */}
                <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin"></div>

                {/* Inner Core */}
                <div className="w-24 h-24 bg-primary/20 rounded-full blur-md animate-pulse"></div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-mono text-primary neon-text tracking-widest">
                    SYNCING...
                </div>
            </div>
            <div className="mt-8 font-mono text-primary/60 text-sm animate-pulse tracking-widest">
                ESTABLISHING NEURAL LINK
            </div>
        </div>
    );
}
