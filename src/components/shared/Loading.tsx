"use client";

import React from "react";
import { cn } from "@/components/shared/utils/common";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "card" | "inline" | "skeleton";
  text?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const LoadingSpinner: React.FC<{
  size: keyof typeof sizeClasses;
  className?: string;
}> = ({ size, className }) => (
  <div
    className={cn(
      "animate-spin rounded-full border-2 border-primary border-t-transparent",
      sizeClasses[size],
      className,
    )}
  />
);

const LoadingCard: React.FC<{ text?: string; className?: string }> = ({
  text,
  className,
}) => (
  <div
    className={cn(
      "flex items-center justify-center h-32 bg-gray-800/50 animate-pulse rounded-lg border border-gray-700",
      className,
    )}
  >
    <div className="text-center space-y-2">
      <LoadingSpinner size="md" />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  </div>
);

const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse", className)}>
    <div className="h-full bg-gray-800/50 rounded"></div>
  </div>
);

const LoadingInline: React.FC<{ text?: string; className?: string }> = ({
  text,
  className,
}) => (
  <div className={cn("flex items-center space-x-2", className)}>
    <LoadingSpinner size="sm" />
    {text && <span className="text-sm text-gray-400">{text}</span>}
  </div>
);

export const Loading: React.FC<LoadingProps> = ({
  className,
  size = "md",
  variant = "default",
  text,
  showText = false,
}) => {
  const displayText = showText ? text : undefined;

  switch (variant) {
    case "card":
      return <LoadingCard text={displayText} className={className} />;
    case "skeleton":
      return <LoadingSkeleton className={className} />;
    case "inline":
      return <LoadingInline text={displayText} className={className} />;
    default:
      return <LoadingSpinner size={size} className={className} />;
  }
};

// Specialized loading components for common use cases
export const PageLoading: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => (
  <div className="min-h-screen flex items-center justify-center">
    <Loading variant="card" text={message} />
  </div>
);

export const ComponentLoading: React.FC<{
  height?: string;
  message?: string;
}> = ({ height = "h-32", message }) => (
  <div className={cn("flex items-center justify-center", height)}>
    <Loading variant="card" text={message} />
  </div>
);

export const InlineLoading: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => <Loading variant="inline" text={message} />;

export const SkeletonLoading: React.FC<{ className?: string }> = ({
  className,
}) => <Loading variant="skeleton" className={className} />;

// Loading states for different component types
export const createLoadingComponent = (
  type: LoadingProps["variant"] = "card",
  defaultProps?: Partial<LoadingProps>,
) => {
  return (props: LoadingProps) => (
    <Loading {...defaultProps} {...props} variant={type} />
  );
};

// Pre-configured loading components
export const CardLoader = createLoadingComponent("card", { size: "md" });
export const InlineLoader = createLoadingComponent("inline", { size: "sm" });
export const SkeletonLoader = createLoadingComponent("skeleton");
