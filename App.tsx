
import React, { useState, useCallback, useRef } from 'react';
import { Theme, ParticleConfig } from './types';
import { THEMES, DEFAULT_CONFIG } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import { analyzeDrawing } from './services/geminiService';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.SPARKLE);
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
        density: 50, 
        speed: 7.5, 
        gravity: 0.3, 
        size: 2.2, 
        decay: 0.9, 
        trailPersistence: 0.9 
      });
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#000000] text-white font-sans">
      <ParticleCanvas 
        config={config} 
        colors={THEMES[theme]} 
        currentTheme={theme}
        useCamera={useCamera} 
      />

      {analysisResult && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#000000]/95 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-500 max-w-md text-center z-50">
          <p className="text-xl font-light tracking-wide text-orange-50/80 mb-3">"{analysisResult.split('.')[0]}"</p>
          <p className="text-xs text-gray-700 italic leading-relaxed">{analysisResult.split('.').slice(1).join('.')}</p>
        </div>
      )}

      <div className="absolute top-6 right-6 flex flex-col gap-3 z-40">
        <button 
          onClick={toggleControls}
          className="w-10 h-10 bg-[#000000] hover:bg-[#050505] rounded-full flex items-center justify-center transition-all border border-white/5 shadow-lg"
        >
          <span className="text-sm">{showControls ? '✕' : '⚙️'}</span>
        </button>
        <button 
          onClick={toggleCamera}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border border-white/5 ${useCamera ? 'bg-orange-950 text-white shadow-lg shadow-orange-950/20' : 'bg-[#000000] hover:bg-[#050505]'}`}
          title="Toggle Sparkler Mode"
        >
          <span className="text-sm">📷</span>
        </button>
      </div>

      {showControls && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-72 bg-[#000000] p-8 rounded-[2rem] border border-white/5 shadow-2xl animate-in slide-in-from-left duration-500 z-30">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-orange-950/20 rounded-lg flex items-center justify-center text-orange-800 border border-orange-900/10">🔥</div>
            <h1 className="text-xl font-medium tracking-tight bg-gradient-to-r from-gray-400 to-gray-800 bg-clip-text text-transparent">
              Celestial Trace
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-gray-800 mb-3 block font-semibold">Brush Palette</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.values(Theme).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`py-1.5 px-2 rounded-lg border transition-all text-[9px] font-medium tracking-wider truncate ${
                      theme === t ? 'bg-white/5 text-white border-white/10' : 'bg-[#000000] border-transparent text-gray-800 hover:bg-white/5'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Slider 
                label="Dissipation" value={config.trailPersistence} min={0.5} max={1.0} step={0.01}
                onChange={(v) => setConfig({ ...config, trailPersistence: v })} 
              />
              <Slider 
                label="Heat / Size" value={config.size} min={0.5} max={5} step={0.1}
                onChange={(v) => setConfig({ ...config, size: v })} 
              />
              <Slider 
                label="Spark Density" value={config.density} min={10} max={100} 
                onChange={(v) => setConfig({ ...config, density: v })} 
              />
            </div>

            <button
              onClick={handleSnapshot}
              disabled={isAnalyzing}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-medium tracking-wide ${
                isAnalyzing 
                  ? 'bg-orange-950/10 text-orange-900' 
                  : 'bg-[#030303] hover:bg-[#070707] border border-white/5 text-gray-700 active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <div className="w-3 h-3 border border-orange-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><span>✨</span> Interpret Artwork</>
              )}
            </button>
          </div>

          <p className="mt-8 text-[8px] text-gray-900 text-center uppercase tracking-[0.4em]">
            Obsidian Core Engine
          </p>
        </div>
      )}

      <div className="absolute bottom-6 right-6 flex items-center gap-2 opacity-5 text-[9px] tracking-[0.2em] uppercase pointer-events-none font-light">
        <span className="w-1 h-1 bg-orange-950 rounded-full"></span>
        Zero Ambient Mode
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
      <label className="text-[9px] font-medium text-gray-800 uppercase tracking-widest">{label}</label>
      <span className="text-[9px] text-gray-800 font-mono">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-0.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-orange-950"
    />
  </div>
);

export default App;
