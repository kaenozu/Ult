import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

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

      // Add a small delay for any animations to settle if needed, or capturing instant state
      // Capture
      const canvas = await html2canvas(element, {
        backgroundColor: '#111827', // Ensure dark background
        logging: false,
        useCORS: true,
        scale: 1,
      } as any);

      const base64Image = canvas.toDataURL('image/png');
      setIsCapturing(false);
      return base64Image;
    } catch (err: any) {
      console.error("Capture failed:", err);
      setError(err.message || 'Capture failed');
      setIsCapturing(false);
      return null;
    }
  }, []);

  return { capture, isCapturing, error };
};
