/**
 * PolicyNetwork.ts
 * 
 * Policy network for action selection using simple feedforward neural network
 */

import { NetworkArchitecture, PolicyOutput, State } from './types';

/**
 * Simple feedforward policy network
 */
export class PolicyNetwork {
  private layers: {
    weights: number[][];
    bias: number[];
  }[];
  private architecture: NetworkArchitecture;

  constructor(inputSize: number, outputSize: number, hiddenSize: number = 128) {
    this.architecture = {
      inputSize,
      hiddenLayers: [hiddenSize, hiddenSize],
      outputSize,
      learningRate: 0.0003,
    };

    this.layers = this.initializeLayers();
  }

  /**
   * Initialize network layers with Xavier initialization
   */
  private initializeLayers(): { weights: number[][]; bias: number[] }[] {
    const layers: { weights: number[][]; bias: number[] }[] = [];
    const sizes = [
      this.architecture.inputSize,
      ...this.architecture.hiddenLayers,
      this.architecture.outputSize,
    ];

    for (let i = 0; i < sizes.length - 1; i++) {
      const inputSize = sizes[i];
      const outputSize = sizes[i + 1];
      
      // Xavier initialization
      const scale = Math.sqrt(2.0 / (inputSize + outputSize));
      const weights: number[][] = [];
      
      for (let j = 0; j < outputSize; j++) {
        const row: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          row.push((Math.random() * 2 - 1) * scale);
        }
        weights.push(row);
      }

      const bias = new Array(outputSize).fill(0);
      layers.push({ weights, bias });
    }

    return layers;
  }

  /**
   * Forward pass through the network
   */
  forward(state: State): PolicyOutput {
    let input = state.normalized;

    // Forward through hidden layers with ReLU activation
    for (let i = 0; i < this.layers.length - 1; i++) {
      input = this.dense(input, this.layers[i].weights, this.layers[i].bias);
      input = this.relu(input);
    }

    // Output layer with softmax
    const lastLayer = this.layers[this.layers.length - 1];
    const logits = this.dense(input, lastLayer.weights, lastLayer.bias);
    const actionProbs = this.softmax(logits);
    const logProbs = logits.map(x => Math.log(Math.max(x, 1e-8)));
    const entropy = this.computeEntropy(actionProbs);

    return { actionProbs, logProbs, entropy };
  }

  /**
   * Dense layer computation
   */
  private dense(input: number[], weights: number[][], bias: number[]): number[] {
    const output: number[] = [];
    for (let i = 0; i < weights.length; i++) {
      let sum = bias[i];
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * weights[i][j];
      }
      output.push(sum);
    }
    return output;
  }

  /**
   * ReLU activation
   */
  private relu(input: number[]): number[] {
    return input.map(x => Math.max(0, x));
  }

  /**
   * Softmax activation
   */
  private softmax(input: number[]): number[] {
    const maxVal = Math.max(...input);
    const expValues = input.map(x => Math.exp(x - maxVal));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(x => x / sumExp);
  }

  /**
   * Compute entropy of action distribution
   */
  private computeEntropy(probs: number[]): number {
    let entropy = 0;
    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }
    return entropy;
  }

  /**
   * Update network parameters (simplified gradient descent)
   */
  update(gradients: number[][][], learningRate: number): void {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const grad = gradients[i];

      for (let j = 0; j < layer.weights.length; j++) {
        for (let k = 0; k < layer.weights[j].length; k++) {
          layer.weights[j][k] -= learningRate * grad[j][k];
        }
      }

      // Update bias
      for (let j = 0; j < layer.bias.length; j++) {
        layer.bias[j] -= learningRate * grad[j][0];
      }
    }
  }

  /**
   * Get network parameters
   */
  getParameters(): { weights: number[][]; bias: number[] }[] {
    return this.layers.map(layer => ({
      weights: layer.weights.map(row => [...row]),
      bias: [...layer.bias],
    }));
  }

  /**
   * Set network parameters
   */
  setParameters(params: { weights: number[][]; bias: number[] }[]): void {
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].weights = params[i].weights.map(row => [...row]);
      this.layers[i].bias = [...params[i].bias];
    }
  }

  /**
   * Clone the network
   */
  clone(): PolicyNetwork {
    const cloned = new PolicyNetwork(
      this.architecture.inputSize,
      this.architecture.outputSize,
      this.architecture.hiddenLayers[0]
    );
    cloned.setParameters(this.getParameters());
    return cloned;
  }
}
