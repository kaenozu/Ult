/**
 * Supply/Demand Walls Plugin for Chart.js
 * 
 * Visualizes supply and demand levels as horizontal bars on the chart.
 * - Support levels are shown in green (below current price)
 * - Resistance levels are shown in red (above current price)
 * - Bar width indicates strength of the level
 */

import { Chart, ChartType } from 'chart.js';
import { VOLUME_PROFILE } from '@/app/lib/constants';

export interface SupplyDemandWallsOptions {
  enabled: boolean;
  data: { price: number; strength: number }[] | undefined;
  currentPrice: number;
  supplyDemand?: {
    supportLevels: Array<{ price: number; strength: number; level: string }>;
    resistanceLevels: Array<{ price: number; strength: number; level: string }>;
  };
}

/**
 * Enhanced plugin to visualize supply/demand walls with proper color coding
 * @param chart - Chart.js chart instance
 * @param _args - Chart.js plugin arguments (unused, but required by plugin interface)
 * @param options - Plugin configuration options
 */
export const supplyDemandWallsPlugin = {
  id: 'supplyDemandWalls',
  
  afterDatasetsDraw: (chart: Chart, _args: unknown, options: SupplyDemandWallsOptions) => {
    if (!options.enabled) return;
    
    const { ctx, chartArea: { right, width, top, bottom } } = chart;
    const yAxis = chart.scales.y;
    const currentPrice = options.currentPrice;

    ctx.save();
    ctx.shadowBlur = 0;

    // Draw supply/demand levels if available
    if (options.supplyDemand) {
      const { supportLevels, resistanceLevels } = options.supplyDemand;

      // Draw support levels (green)
      supportLevels.forEach((level) => {
        const yPos = yAxis.getPixelForValue(level.price);
        if (yPos === undefined || yPos < top || yPos > bottom) return;

        const color = VOLUME_PROFILE.SUPPORT_RGB;
        const barWidth = width * VOLUME_PROFILE.MAX_BAR_WIDTH_RATIO * level.strength;
        const barHeight = (bottom - top) / VOLUME_PROFILE.HEIGHT_DIVISOR;

        // Create gradient for smooth appearance
        const gradient = ctx.createLinearGradient(right - barWidth, 0, right, 0);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(1, `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA + level.strength * VOLUME_PROFILE.STRENGTH_ALPHA_ADD})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(right - barWidth, yPos - barHeight / 2, barWidth, barHeight);

        // Draw indicator line for strong levels
        if (level.strength >= 0.7) {
          ctx.strokeStyle = `rgba(${color}, 0.9)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(right - barWidth, yPos);
          ctx.stroke();
        }
      });

      // Draw resistance levels (red)
      resistanceLevels.forEach((level) => {
        const yPos = yAxis.getPixelForValue(level.price);
        if (yPos === undefined || yPos < top || yPos > bottom) return;

        const color = VOLUME_PROFILE.RESISTANCE_RGB;
        const barWidth = width * VOLUME_PROFILE.MAX_BAR_WIDTH_RATIO * level.strength;
        const barHeight = (bottom - top) / VOLUME_PROFILE.HEIGHT_DIVISOR;

        // Create gradient for smooth appearance
        const gradient = ctx.createLinearGradient(right - barWidth, 0, right, 0);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(1, `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA + level.strength * VOLUME_PROFILE.STRENGTH_ALPHA_ADD})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(right - barWidth, yPos - barHeight / 2, barWidth, barHeight);

        // Draw indicator line for strong levels
        if (level.strength >= 0.7) {
          ctx.strokeStyle = `rgba(${color}, 0.9)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(right - barWidth, yPos);
          ctx.stroke();
        }
      });
    } else if (options.data && options.data.length > 0) {
      // Fallback to basic volume resistance visualization
      options.data.forEach((wall) => {
        const yPos = yAxis.getPixelForValue(wall.price);
        if (yPos === undefined || yPos < top || yPos > bottom) return;

        const isAbove = wall.price > currentPrice;
        const color = isAbove ? VOLUME_PROFILE.RESISTANCE_RGB : VOLUME_PROFILE.SUPPORT_RGB;
        const barWidth = width * VOLUME_PROFILE.MAX_BAR_WIDTH_RATIO * wall.strength;
        const barHeight = (bottom - top) / VOLUME_PROFILE.HEIGHT_DIVISOR;

        // Draw smooth, semi-transparent bars
        const gradient = ctx.createLinearGradient(right - barWidth, 0, right, 0);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(1, `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA + wall.strength * VOLUME_PROFILE.STRENGTH_ALPHA_ADD})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(right - barWidth, yPos - barHeight / 2, barWidth, barHeight);

        // Draw thin indicator line at the right edge
        ctx.fillStyle = `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA})`;
        ctx.fillRect(right - 2, yPos - barHeight / 2, 2, barHeight);
      });
    }

    ctx.restore();
  }
};
