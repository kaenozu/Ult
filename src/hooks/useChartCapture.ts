import { useState, useCallback } from 'react';
import domtoimage from 'dom-to-image-more';

interface UseChartCaptureReturn {
  capture: (elementId: string) => Promise<string | null>;
  isCapturing: boolean;
  error: string | null;
}

export const useChartCapture = (): UseChartCaptureReturn => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (elementId: string): Promise<string | null> => {
    setIsCapturing(true);
    setError(null);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id '${elementId}' not found`);
      }

      // 1. Force background color to avoid transparency issues
      // 2. Filter out problematic nodes if necessary (optional)
      const dataUrl = await domtoimage.toPng(element, {
        bgcolor: '#111827', // Tailwind gray-900
        quality: 1.0,
        // Optional: filter out elements that don't need to be captured
        // filter: (node) => node.tagName !== 'BUTTON', 
      });

      setIsCapturing(false);
      return dataUrl;
    } catch (err: any) {
      console.error("Capture failed:", err);
      // Fallback or specific error handling
      if (err.message && err.message.includes("lab")) {
        // Known issue with some color spaces, but dom-to-image should handle better or fail differently
      }
      setError(err.message || 'Capture failed');
      setIsCapturing(false);
      return null;
    }
  }, []);

  return { capture, isCapturing, error };
};
