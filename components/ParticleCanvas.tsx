
import React, { useRef, useEffect, useState } from 'react';
import { ParticleConfig, ThemeColors, Theme } from '../types';

interface ParticleCanvasProps {
  config: ParticleConfig;
  colors: ThemeColors;
  currentTheme: Theme;
  useCamera: boolean;
  onSnapshot?: (base64: string) => void;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decayRate: number;
  size: number;
  theme: Theme;
  color: string;

  constructor(x: number, y: number, theme: Theme, palette: string[], speed: number, size: number) {
    this.x = x;
    this.y = y;
    this.theme = theme;
    const angle = Math.random() * Math.PI * 2;
    const velocity = (Math.random() * speed * 0.4) + (theme === Theme.SPARKLE ? 0.5 : 0.2);
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity - (theme === Theme.SPARKLE ? 0.2 : 0);
    this.life = 1.0;
    this.decayRate = 0.96 + Math.random() * 0.03; 
    this.size = size * (0.3 + Math.random() * 0.5);
    this.color = palette[Math.floor(Math.random() * palette.length)];
  }

  update(configDecay: number, gravity: number) {
    this.vx *= 0.95; 
    this.vy *= 0.95;
    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life *= (configDecay * this.decayRate); 
    return this.life > 0.01;
  }

  getSparkleColor() {
    // Highly desaturated and darker tones for the sparkle to avoid "blinding" white
    if (this.life > 0.85) return 'rgba(230, 200, 100, 0.6)';
    if (this.life > 0.5) return 'rgba(180, 120, 40, 0.4)';
    return 'rgba(80, 30, 10, 0.2)';
  }

  draw(ctx: CanvasRenderingContext2D, glow: boolean) {
    const isSparkle = this.theme === Theme.SPARKLE;
    const drawColor = isSparkle ? this.getSparkleColor() : this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * Math.sqrt(this.life), 0, Math.PI * 2);
    ctx.fillStyle = drawColor;
    
    // Minimal opacity: individual particles are almost invisible, only group motion shines softly
    const baseAlpha = isSparkle ? 0.2 : 0.12;
    ctx.globalAlpha = Math.min(1, this.life * baseAlpha);
    ctx.fill();

    if (glow && this.life > 0.8) {
      // Extremely tight glow, almost invisible spread
      ctx.shadowBlur = isSparkle ? 1.0 : 0.5;
      ctx.shadowColor = drawColor;
    } else {
      ctx.shadowBlur = 0;
    }
  }
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ config, colors, currentTheme, useCamera }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: -100, y: -100, isDown: false, lastX: -100, lastY: -100 });
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const [trackMarker, setTrackMarker] = useState({ x: 0, y: 0, active: false });
  
  const PROC_WIDTH = 48;
  const PROC_HEIGHT = 36;

  useEffect(() => {
    if (!useCamera) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: 60 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) { console.error(e); }
    };
    startCamera();
  }, [useCamera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const pCanvas = processingCanvasRef.current;
    const pCtx = pCanvas?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !pCtx || !pCanvas) return;

    let animId: number;

    const trackHand = () => {
      if (!useCamera || !videoRef.current || videoRef.current.readyState < 2) return null;

      pCtx.save();
      pCtx.scale(-1, 1);
      pCtx.drawImage(videoRef.current, -PROC_WIDTH, 0, PROC_WIDTH, PROC_HEIGHT);
      pCtx.restore();

      const data = pCtx.getImageData(0, 0, PROC_WIDTH, PROC_HEIGHT).data;
      let sumX = 0, sumY = 0, count = 0;

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        for (let i = 0; i < data.length; i += 24) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (r + g + b) * 0.333;
          const diff = Math.abs(r - prev[i]) + Math.abs(g - prev[i+1]) + Math.abs(b - prev[i+2]);

          const energy = (diff * 0.5) + (brightness > 210 ? brightness * 0.5 : 0);
          if (energy > 40) {
            const idx = i >> 2;
            const x = idx % PROC_WIDTH;
            const y = (idx / PROC_WIDTH) | 0;
            sumX += x * energy;
            sumY += y * energy;
            count += energy;
          }
        }
      }

      if (!prevFrameRef.current) prevFrameRef.current = new Uint8ClampedArray(data.length);
      prevFrameRef.current.set(data);

      if (count > 150) {
        const targetX = (sumX / count);
        const targetY = (sumY / count);
        setTrackMarker({ x: targetX / PROC_WIDTH * 100, y: targetY / PROC_HEIGHT * 100, active: true });
        return {
          x: (targetX / PROC_WIDTH) * canvas.width,
          y: (targetY / PROC_HEIGHT) * canvas.height
        };
      } else {
        setTrackMarker(prev => ({ ...prev, active: false }));
      }
      return null;
    };

    const loop = () => {
      // CLEAR LAYER: Source-over ensures we are actually painting black over the light
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = config.trailPersistence; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      const pos = trackHand();
      if (pos) {
        const snap = 0.95; 
        pointerRef.current.x = pointerRef.current.x === -100 ? pos.x : pointerRef.current.x * (1 - snap) + pos.x * snap;
        pointerRef.current.y = pointerRef.current.y === -100 ? pos.y : pointerRef.current.y * (1 - snap) + pos.y * snap;
        pointerRef.current.isDown = true;
      } else if (useCamera) {
        pointerRef.current.isDown = false;
      }

      // PARTICLE LAYER: Lighter is good but only if particles are faint
      ctx.globalCompositeOperation = 'lighter';
      particlesRef.current = particlesRef.current.filter(p => {
        const alive = p.update(config.decay, config.gravity);
        if (alive) p.draw(ctx, config.glow);
        return alive;
      });

      if (pointerRef.current.isDown) {
        const dX = pointerRef.current.x - pointerRef.current.lastX;
        const dY = pointerRef.current.y - pointerRef.current.lastY;
        const dist = Math.sqrt(dX * dX + dY * dY);
        const steps = pointerRef.current.lastX === -100 ? 1 : Math.max(1, Math.min(3, Math.floor(dist / 30)));
        const burst = currentTheme === Theme.SPARKLE ? config.density : config.density * 0.5;

        for (let s = 0; s < steps; s++) {
          const px = pointerRef.current.lastX + (dX * (s / steps));
          const py = pointerRef.current.lastY + (dY * (s / steps));
          for (let i = 0; i < burst / steps; i++) {
            particlesRef.current.push(new Particle(
              px + (Math.random() - 0.5) * 1.2,
              py + (Math.random() - 0.5) * 1.2,
              currentTheme,
              colors.palette,
              config.speed,
              config.size
            ));
          }
        }
      }

      pointerRef.current.lastX = pointerRef.current.x;
      pointerRef.current.lastY = pointerRef.current.y;
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [config, colors, currentTheme, useCamera]);

  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={processingCanvasRef} width={PROC_WIDTH} height={PROC_HEIGHT} className="hidden" />
      <canvas
        ref={canvasRef}
        onPointerMove={e => { if(!useCamera){ pointerRef.current.x = e.clientX; pointerRef.current.y = e.clientY; }}}
        onPointerDown={e => { if(!useCamera){ pointerRef.current.isDown = true; pointerRef.current.x = e.clientX; pointerRef.current.y = e.clientY; }}}
        onPointerUp={() => { if(!useCamera) pointerRef.current.isDown = false; }}
        className="w-full h-full block cursor-crosshair"
      />
      
      {useCamera && (
        <div className="absolute top-6 left-6 w-32 h-24 border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-50 pointer-events-none bg-black/40">
          <video 
            ref={el => { if(el && videoRef.current) el.srcObject = videoRef.current.srcObject; }} 
            autoPlay playsInline muted 
            className="w-full h-full object-cover scale-x-[-1] opacity-30" 
          />
          {trackMarker.active && (
            <div 
              className="absolute w-3 h-3 border border-red-500 rounded-full bg-red-500/20"
              style={{ left: `${trackMarker.x}%`, top: `${trackMarker.y}%`, transform: 'translate(-50%, -50%)' }}
            />
          )}
          <div className="absolute bottom-1 left-2 flex items-center gap-1 opacity-50">
            <div className={`w-1 h-1 rounded-full ${trackMarker.active ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-[7px] font-bold text-white uppercase tracking-tighter">
              {trackMarker.active ? 'LOCKED' : 'SEARCH'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticleCanvas;
