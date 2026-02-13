import { calculateIndicatorsSync } from './indicator-logic';

const ctx: Worker = self as any;

/**
 * テクニカル指標計算 Web Worker
 */
ctx.onmessage = (event: MessageEvent) => {
  const { data, requestId } = event.data;
  
  try {
    const results = calculateIndicatorsSync(data);
    ctx.postMessage({ requestId, results, success: true });
  } catch (error) {
    ctx.postMessage({ 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      success: false 
    });
  }
};
