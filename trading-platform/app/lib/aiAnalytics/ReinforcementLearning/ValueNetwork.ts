/**
 * ValueNetwork.ts
 * 
 * Value network for state value estimation
 */

import { NetworkArchitecture, ValueOutput, State } from './types';

/**
 * Simple feedforward value network
 */
export class ValueNetwork {
  private layers: {
    weights: number[][];
    bias: number[];
  }[];
  private architecture: NetworkArchitecture;

  constructor(inputSize: number, hiddenSize: number = 128) {
    this.architecture = {
      inputSize,
      hiddenLayers: [hiddenSize, hiddenSize],
      outputSize: 1, // Single value output
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
  forward(state: State): ValueOutput {
    let input = state.normalized;

    // Forward through all layers
    for (let i = 0; i < this.layers.length; i++) {
      input = this.dense(input, this.layers[i].weights, this.layers[i].bias);
      
      // ReLU for hidden layers, linear for output
      if (i < this.layers.length - 1) {
        input = this.relu(input);
      }
    }

    return { value: input[0] };
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
  clone(): ValueNetwork {
    const cloned = new ValueNetwork(
      this.architecture.inputSize,
      this.architecture.hiddenLayers[0]
    );
    cloned.setParameters(this.getParameters());
    return cloned;
  }
}
