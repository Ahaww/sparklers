
import { Theme, ThemeColors, ParticleConfig } from './types';

export const THEMES: Record<Theme, ThemeColors> = {
  [Theme.GALAXY]: {
    primary: '#4f46e5',
    secondary: '#c084fc',
    background: '#000000',
    palette: ['#4f46e5', '#818cf8', '#a78bfa', '#6366f1', '#4338ca']
  },
  [Theme.NEBULA]: {
    primary: '#db2777',
    secondary: '#7c3aed',
    background: '#000000',
    palette: ['#db2777', '#9d174d', '#7c3aed', '#5b21b6', '#4c1d95']
  },
  [Theme.SOLAR]: {
    primary: '#ea580c',
    secondary: '#fbbf24',
    background: '#000000',
    palette: ['#ea580c', '#9a3412', '#f59e0b', '#b45309', '#78350f']
  },
  [Theme.FOREST]: {
    primary: '#059669',
    secondary: '#34d399',
    background: '#000000',
    palette: ['#059669', '#065f46', '#10b981', '#047857', '#064e3b']
  },
  [Theme.CYBERPUNK]: {
    primary: '#06b6d4',
    secondary: '#d946ef',
    background: '#000000',
    palette: ['#0891b2', '#0e7490', '#c026d3', '#a21caf', '#701a75']
  },
  [Theme.SPARKLE]: {
    primary: '#ffffff',
    secondary: '#ffaa00',
    background: '#000000',
    palette: ['#ffffff', '#fff5cc', '#ffcc00', '#ff9900', '#ff6600', '#cc3300', '#220500']
  }
};

export const DEFAULT_CONFIG: ParticleConfig = {
  size: 2.2, 
  density: 50, 
  decay: 0.9, // 稍微加快粒子生命周期衰减
  speed: 7.5,  
  gravity: 0.3, 
  glow: true,
  trailPersistence: 0.9 // 默认更强劲的背景清理
};
