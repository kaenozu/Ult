"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: "trade" | "price_alert" | "system" | "portfolio";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: "primary" | "secondary";
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 10)); // Keep max 10 notifications

      // Auto-remove after 10 seconds if no actions
      if (!notification.actions || notification.actions.length === 0) {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, 10000);
      }
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {notifications.map((notification) => (
          <SwipeNotification
            key={notification.id}
            notification={notification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function SwipeNotification({
  notification,
}: {
  notification: Notification;
}): React.ReactElement {
  const { removeNotification } = useNotifications();
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const dragX = useRef(0);

  const getIcon = () => {
    switch (notification.type) {
      case "trade":
        return <TrendingUp className="w-5 h-5" />;
      case "price_alert":
        return <AlertTriangle className="w-5 h-5" />;
      case "portfolio":
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = () => {
    switch (notification.severity) {
      case "critical":
        return "bg-red-500 border-red-600";
      case "warning":
        return "bg-yellow-500 border-yellow-600";
      default:
        return "bg-blue-500 border-blue-600";
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      if (info.offset.x < 0) {
        // Swipe left - dismiss
        removeNotification(notification.id);
      } else if (info.offset.x > 0 && notification.actions?.[0]) {
        // Swipe right - execute primary action
        notification.actions[0].action();
        removeNotification(notification.id);
      }
    }
    setSwipeDirection(null);
    dragX.current = 0;
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDrag={(e, info) => {
        dragX.current = info.offset.x;
        setSwipeDirection(info.offset.x < 0 ? "left" : "right");
      }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -300, scale: 0.8 }}
      className={cn(
        "relative overflow-hidden rounded-lg border-l-4 shadow-lg p-4 cursor-grab active:cursor-grabbing",
        "bg-background border border-border",
        getSeverityColor(),
      )}
    >
      {/* Swipe indicators */}
      <div className="absolute inset-0 flex justify-between items-center pointer-events-none">
        <div
          className={cn(
            "bg-red-500 text-white px-3 py-1 rounded-r-md text-sm font-medium transition-all",
            swipeDirection === "left" && dragX.current < -50
              ? "opacity-100"
              : "opacity-0",
          )}
        >
          Dismiss
        </div>
        <div
          className={cn(
            "bg-green-500 text-white px-3 py-1 rounded-l-md text-sm font-medium transition-all",
            swipeDirection === "right" &&
              dragX.current > 50 &&
              notification.actions?.length
              ? "opacity-100"
              : "opacity-0",
          )}
        >
          {notification.actions?.[0]?.label || "Action"}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <div
            className={cn("rounded-full p-2 text-white", getSeverityColor())}
          >
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground">
              {notification.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {notification.message}
            </p>

            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      removeNotification(notification.id);
                    }}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      action.variant === "primary"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => removeNotification(notification.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
