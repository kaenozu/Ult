import { calculateIndicatorsSync } from './indicator-logic';

/**
 * テクニカル指標計算 Web Worker
 */
self.onmessage = (event: MessageEvent) => {
  const { data, requestId } = event.data;
  
  try {
    const results = calculateIndicatorsSync(data);
    self.postMessage({ requestId, results, success: true });
  } catch (error) {
    self.postMessage({ 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      success: false 
    });
  }
};
