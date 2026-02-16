import React, { useState, useEffect, useRef, memo } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 最適化された画像コンポーネント
 * 
 * - WebP/AVIF自動変換
 * - 遅延読み込み（Intersection Observer）
 * - プレースホルダー表示
 * - CLS防止（アスペクト比維持）
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  sizes = '100vw',
  placeholder = 'empty',
  blurDataURL,
  quality = 75,
  loading = 'lazy',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observerで遅延読み込み
  useEffect(() => {
    if (priority || !imageRef.current) {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observerRef.current.observe(imageRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // エラー時のフォールバック
  if (error) {
    return (
      <div
        ref={imageRef}
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
      >
        <span className="text-gray-500 text-sm">画像を読み込めません</span>
      </div>
    );
  }

  // ビューポート内になるまでプレースホルダーを表示
  if (!isInView) {
    return (
      <div
        ref={imageRef}
        className={`bg-gray-800 animate-pulse ${className}`}
        style={
          fill
            ? { position: 'absolute', inset: 0 }
            : { width, height }
        }
      />
    );
  }

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={fill ? {} : { width, height }}
    >
      {/* プレースホルダー */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-800 animate-pulse"
          style={
            placeholder === 'blur' && blurDataURL
              ? {
                  backgroundImage: `url(${blurDataURL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(20px)',
                }
              : {}
          }
        />
      )}

      {/* Next.js Imageコンポーネント */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={sizes}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
});

/**
 * アバター画像用コンポーネント
 * 小さく軽量な画像に最適化
 */
export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 40,
  className = '',
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      quality={60}
      sizes={`${size}px`}
    />
  );
});

/**
 * アイコン画像用コンポーネント
 * SVGアイコンを最適化
 */
export const IconImage = memo(function IconImage({
  src,
  alt,
  size = 24,
  className = '',
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      quality={50}
      sizes={`${size}px`}
      priority // アイコンは重要なので優先
    />
  );
});

/**
 * 背景画像用コンポーネント
 * 大きな画像を効率的に読み込み
 */
export const BackgroundImage = memo(function BackgroundImage({
  src,
  alt,
  className = '',
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="absolute inset-0 z-0"
        quality={70}
        sizes="100vw"
        priority
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
});
