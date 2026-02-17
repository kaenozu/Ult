import { Chart } from 'chart.js';
import { VOLUME_PROFILE } from '@/app/constants';
import { VolumeProfilePluginOptions } from '../types';

export const volumeProfilePlugin = {
  id: 'volumeProfile',
  afterDatasetsDraw: (chart: Chart, _args: unknown, options: VolumeProfilePluginOptions) => {
    if (!options.enabled || !options.data || options.data.length === 0) return;

    const { ctx, chartArea: { right, width, top, bottom } } = chart;
    const yAxis = chart.scales.y;
    const currentPrice = options.currentPrice;

    ctx.save();
    // Disable shadow for cleaner look
    ctx.shadowBlur = 0;

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

      // Draw very thin indicator line at the right edge
      ctx.fillStyle = `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA})`;
      ctx.fillRect(right - 2, yPos - barHeight / 2, 2, barHeight);
    });
    ctx.restore();
  }
};
