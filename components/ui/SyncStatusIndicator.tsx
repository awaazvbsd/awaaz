import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SyncStatusIndicator: React.FC = () => {
    const [syncStatus, setSyncStatus] = useState<{ isOnline: boolean; pendingItems: number }>({
        isOnline: navigator.onLine,
        pendingItems: 0
    });
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const handleStatusUpdate = (e: any) => {
            const { isOnline, pendingItems } = e.detail;
            setSyncStatus({ isOnline, pendingItems });
            if (pendingItems === 0 && isOnline) {
                setLastSyncTime(Date.now());
            }
        };

        window.addEventListener('awaaz_sync_status' as any, handleStatusUpdate);
        return () => window.removeEventListener('awaaz_sync_status' as any, handleStatusUpdate);
    }, []);

    const getStatusContent = () => {
        if (!syncStatus.isOnline) {
            return {
                icon: <CloudOff className="w-4 h-4 text-red-400" />,
                text: 'Offline Mode',
                color: 'text-red-400'
            };
        }
        if (syncStatus.pendingItems > 0) {
            return {
                icon: <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />,
                text: `Syncing ${syncStatus.pendingItems} items...`,
                color: 'text-purple-400'
            };
        }
        return {
            icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
            text: 'All Data Synced',
            color: 'text-green-400'
        };
    };

    const status = getStatusContent();

    const MotionButton = motion.button as any;
    const MotionDiv = motion.div as any;

    return (
        <div className="relative flex items-center">
            <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setShowTooltip(true)}
                onHoverEnd={() => setShowTooltip(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-colors hover:bg-white/10`}
            >
                {status.icon}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                    {status.text}
                </span>
            </MotionButton>

            <AnimatePresence>
                {showTooltip && (
                    <MotionDiv
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 z-[2000] pointer-events-none"
                    >
                        <p className="text-[11px] text-white/60 leading-relaxed">
                            {syncStatus.isOnline
                                ? "Your data is automatically backed up to our secure cloud."
                                : "You're offline. Data is saved locally and will sync when you're back online."}
                        </p>
                        {lastSyncTime && (
                            <p className="text-[9px] text-purple-400/80 mt-2 font-medium">
                                Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                            </p>
                        )}
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};
