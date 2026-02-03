
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
    primary: '#fffbeb',
    secondary: '#fbbf24',
    background: '#000000',
    palette: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#78350f', '#450a0a']
  }
};

export const DEFAULT_CONFIG: ParticleConfig = {
  size: 1.6,
  density: 20, // Reduced density
  decay: 0.97, // Slightly faster decay than before but still long-lasting
  speed: 3.0,
  gravity: 0.08,
  glow: true,
  trailPersistence: 0.18 // Increased: higher value means faster background clearing = darker screen
};
