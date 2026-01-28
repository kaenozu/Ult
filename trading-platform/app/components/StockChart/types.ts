export interface VolumeProfilePluginOptions {
  enabled: boolean;
  data: { price: number; strength: number }[] | undefined;
  currentPrice: number;
}
