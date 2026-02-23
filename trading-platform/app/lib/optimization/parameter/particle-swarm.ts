import type { OptimizationParameter, ParticleSwarmConfig, Particle } from './types';

export class ParticleSwarmOptimizer {
  private parameters: OptimizationParameter[];
  private config: ParticleSwarmConfig;

  constructor(parameters: OptimizationParameter[], config?: Partial<ParticleSwarmConfig>) {
    this.parameters = parameters;
    this.config = {
      swarmSize: 30,
      inertiaWeight: 0.7,
      cognitiveWeight: 1.5,
      socialWeight: 1.5,
      velocityClamp: 0.5,
      ...config
    };
  }

  getConfig(): ParticleSwarmConfig {
    return this.config;
  }

  initializeSwarm(): Particle[] {
    return Array(this.config.swarmSize).fill(null).map(() => ({
      position: this.sampleRandomParameters(),
      velocity: this.initializeVelocity(),
      bestPosition: {},
      bestScore: -Infinity
    }));
  }

  updateParticleVelocity(particle: Particle, globalBest: Record<string, number | string>): void {
    for (const param of this.parameters) {
      if (param.type === 'categorical') continue;

      const r1 = Math.random();
      const r2 = Math.random();

      const cognitive = this.config.cognitiveWeight * r1 *
        ((particle.bestPosition[param.name] as number) - (particle.position[param.name] as number));
      const social = this.config.socialWeight * r2 *
        ((globalBest[param.name] as number) - (particle.position[param.name] as number));

      particle.velocity[param.name] =
        this.config.inertiaWeight * particle.velocity[param.name] + cognitive + social;

      const range = (param.max ?? 1) - (param.min ?? 0);
      const maxVelocity = range * this.config.velocityClamp;
      particle.velocity[param.name] = Math.max(
        -maxVelocity,
        Math.min(maxVelocity, particle.velocity[param.name])
      );
    }
  }

  updateParticlePosition(particle: Particle): void {
    for (const param of this.parameters) {
      if (param.type === 'categorical') continue;

      let newValue = (particle.position[param.name] as number) + particle.velocity[param.name];

      if (param.min !== undefined && param.max !== undefined) {
        newValue = Math.max(param.min, Math.min(param.max, newValue));
      }

      if (param.type === 'discrete') {
        newValue = Math.round(newValue);
      }

      particle.position[param.name] = newValue;
    }
  }

  private sampleRandomParameters(): Record<string, number | string> {
    const result: Record<string, number | string> = {};

    for (const param of this.parameters) {
      if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
        result[param.name] = Math.random() * (param.max - param.min) + param.min;
      } else if (param.type === 'discrete' && param.min !== undefined && param.max !== undefined) {
        result[param.name] = Math.floor(Math.random() * (param.max - param.min + 1)) + param.min;
      } else if (param.type === 'categorical' && param.values) {
        result[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      }
    }

    return result;
  }

  private initializeVelocity(): Record<string, number> {
    const velocity: Record<string, number> = {};

    for (const param of this.parameters) {
      if (param.type !== 'categorical') {
        const range = (param.max ?? 1) - (param.min ?? 0);
        velocity[param.name] = (Math.random() - 0.5) * range * 0.1;
      }
    }

    return velocity;
  }
}
