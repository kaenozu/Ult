export interface VolumeProfilePluginOptions {
  enabled: boolean;
  data: { price: number; strength: number }[] | undefined;
  currentPrice: number;
}

export interface SupplyDemandWallsOptions {
  enabled: boolean;
  data: { price: number; strength: number }[] | undefined;
  currentPrice: number;
  supplyDemand?: {
    supportLevels: Array<{ price: number; strength: number; level: string }>;
    resistanceLevels: Array<{ price: number; strength: number; level: string }>;
  };
}
