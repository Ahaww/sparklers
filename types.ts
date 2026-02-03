
export enum Theme {
  GALAXY = 'GALAXY',
  NEBULA = 'NEBULA',
  SOLAR = 'SOLAR',
  FOREST = 'FOREST',
  CYBERPUNK = 'CYBERPUNK',
  SPARKLE = 'SPARKLE'
}

export interface ParticleConfig {
  size: number;
  density: number;
  decay: number;
  speed: number;
  gravity: number;
  glow: boolean;
  trailPersistence: number;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  palette: string[];
}
