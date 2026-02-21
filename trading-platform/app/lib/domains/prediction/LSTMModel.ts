/**
 * LSTM prediction model
 * 
 * Rule-based simplified implementation for LSTM patterns
 */

import { PredictionFeatures } from '../../../lib/services/feature-engineering-service';
import { IModel } from './interfaces';

export class LSTMModel implements IModel {
  readonly name = 'LSTM';

  private readonly LSTM_SCALING = 0.6;

  /**
   * Predict using LSTM algorithm (simplified)
   * LSTMの予測は価格モメンタムに基づいて簡略化
   */
  predict(features: PredictionFeatures): number {
    // Handle NaN values safely
    const safeMomentum = isNaN(features.priceMomentum) ? 0 : features.priceMomentum;
    return safeMomentum * this.LSTM_SCALING;
  }
}
