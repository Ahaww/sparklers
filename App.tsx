
import React, { useState, useCallback, useRef } from 'react';
import { Theme, ParticleConfig } from './types';
import { THEMES, DEFAULT_CONFIG } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import { analyzeDrawing } from './services/geminiService';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.GALAXY);
  const [config, setConfig] = useState<ParticleConfig>(DEFAULT_CONFIG);
  const [showControls, setShowControls] = useState(true);
  const [useCamera, setUseCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleSnapshot = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    
    const result = await analyzeDrawing(base64);
    setAnalysisResult(result);
    setIsAnalyzing(false);

    setTimeout(() => setAnalysisResult(null), 8000);
  };

  const toggleControls = () => setShowControls(!showControls);
  const toggleCamera = () => {
    const nextState = !useCamera;
    setUseCamera(nextState);
    if (nextState) {
      setTheme(Theme.SPARKLE);
      setConfig({ 
        ...DEFAULT_CONFIG, 
        density: 15, // Further reduced density for camera mode
        speed: 2.5, 
        gravity: 0.05, 
        size: 1.2, 
        trailPersistence: 0.25 // Clear background even faster to stay dark
      });
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      <ParticleCanvas 
        config={config} 
        colors={THEMES[theme]} 
        currentTheme={theme}
        useCamera={useCamera} 
      />

      {!showControls && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-40 text-sm tracking-widest uppercase text-center w-full px-4 font-light">
          {useCamera ? "Move your hands to trace the void" : "Move your cursor to paint with stars"}
        </div>
      )}

      {analysisResult && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-md text-center z-50">
          <p className="text-xl font-light tracking-wide text-indigo-100 mb-3">"{analysisResult.split('.')[0]}"</p>
          <p className="text-xs text-gray-500 italic leading-relaxed">{analysisResult.split('.').slice(1).join('.')}</p>
        </div>
      )}

      <div className="absolute top-6 right-6 flex flex-col gap-3 z-40">
        <button 
          onClick={toggleControls}
          className="w-10 h-10 bg-white/5 hover:bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/5 shadow-lg"
        >
          <span className="text-sm">{showControls ? '✕' : '⚙️'}</span>
        </button>
        <button 
          onClick={toggleCamera}
          className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/5 ${useCamera ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/15'}`}
          title="Toggle Motion Tracking"
        >
          <span className="text-sm">📷</span>
        </button>
      </div>

      {showControls && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-72 bg-black/40 backdrop-blur-3xl p-8 rounded-[2rem] border border-white/5 shadow-2xl animate-in slide-in-from-left duration-500 z-30">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">✨</div>
            <h1 className="text-xl font-medium tracking-tight bg-gradient-to-r from-gray-100 to-gray-500 bg-clip-text text-transparent">
              Celestial Trace
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-gray-600 mb-3 block font-semibold">Palette</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.values(Theme).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`py-1.5 px-2 rounded-lg border transition-all text-[9px] font-medium tracking-wider truncate ${
                      theme === t ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Slider 
                label="Size" value={config.size} min={0.5} max={5} step={0.1}
                onChange={(v) => setConfig({ ...config, size: v })} 
              />
              <Slider 
                label="Density" value={config.density} min={5} max={60} 
                onChange={(v) => setConfig({ ...config, density: v })} 
              />
              <Slider 
                label="Decay" value={config.decay} min={0.9} max={0.99} step={0.01}
                onChange={(v) => setConfig({ ...config, decay: v })} 
              />
            </div>

            <button
              onClick={handleSnapshot}
              disabled={isAnalyzing}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-medium tracking-wide ${
                isAnalyzing 
                  ? 'bg-indigo-900/20 text-indigo-400 border border-indigo-500/10' 
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 active:scale-95 shadow-lg'
              }`}
            >
              {isAnalyzing ? (
                <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><span>✨</span> Interpret Pattern</>
              )}
            </button>
          </div>

          <p className="mt-8 text-[8px] text-gray-700 text-center uppercase tracking-[0.4em]">
            Subtle Motion Art
          </p>
        </div>
      )}

      <div className="absolute bottom-6 right-6 flex items-center gap-2 opacity-20 text-[9px] tracking-[0.2em] uppercase pointer-events-none font-light">
        <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
        Reactive Light
      </div>
    </div>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <label className="text-[9px] font-medium text-gray-600 uppercase tracking-widest">{label}</label>
      <span className="text-[9px] text-gray-400 font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-0.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-gray-500"
    />
  </div>
);

export default App;
