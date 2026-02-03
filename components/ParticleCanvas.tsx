
import React, { useRef, useEffect } from 'react';
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
  isSpark: boolean;

  constructor(x: number, y: number, theme: Theme, palette: string[], speed: number, size: number, isSpark = true) {
    this.x = x;
    this.y = y;
    this.theme = theme;
    this.isSpark = isSpark;
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = isSpark ? (Math.random() * speed + 1.5) : (Math.random() * 0.3);
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    
    this.life = 1.0;
    this.decayRate = isSpark ? (0.86 + Math.random() * 0.1) : (0.92 + Math.random() * 0.05);
    this.size = size * (isSpark ? (0.15 + Math.random() * 0.6) : (0.7 + Math.random() * 0.3));
    this.color = palette[Math.floor(Math.random() * palette.length)];
  }

  update(configDecay: number, gravity: number) {
    const drag = this.isSpark ? 0.92 : 0.97;
    this.vx *= drag;
    this.vy *= drag;
    
    this.vy += gravity * (this.isSpark ? 1.0 : 0.1);
    this.x += this.vx;
    this.y += this.vy;
    
    this.life *= Math.min(this.decayRate, configDecay);
    return this.life > 0.01;
  }

  getSparkleColor() {
    const l = this.life;
    if (l > 0.8) return `rgba(255, 255, 255, 1.0)`; 
    if (l > 0.4) return `rgba(255, 200, 50, ${l})`; 
    if (l > 0.15) return `rgba(180, 60, 0, ${l * 0.6})`; 
    return `rgba(0, 0, 0, 0)`;
  }

  draw(ctx: CanvasRenderingContext2D, glow: boolean) {
    const isSparkle = this.theme === Theme.SPARKLE;
    const drawColor = isSparkle ? this.getSparkleColor() : this.color;
    
    if (isSparkle && this.life < 0.1) return;

    ctx.beginPath();
    const currentSize = this.size * Math.pow(this.life, 0.9);
    ctx.arc(this.x, this.y, Math.max(0.01, currentSize), 0, Math.PI * 2);
    
    ctx.fillStyle = drawColor;
    ctx.globalAlpha = isSparkle ? 1.0 : Math.min(1, this.life * 0.7);
    ctx.fill();

    if (glow && this.life > 0.75) {
      ctx.shadowBlur = this.isSpark ? 0.5 : 3;
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
  
  const pointerRef = useRef({ 
    x: -100, y: -100, 
    lastX: -100, lastY: -100,
    isDown: false,
    confidence: 0 
  });
  
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const trackerPulseRef = useRef(0);
  const smoothedPos = useRef({ x: -100, y: -100 });
  const lastRawPos = useRef({ x: -1, y: -1 });
  
  const PROC_WIDTH = 48; 
  const PROC_HEIGHT = 36;
  const SMOOTH_FACTOR = 0.4;
  const CONFIDENCE_THRESHOLD = 5; 
  const ACTIVATION_ENERGY = 450; 

  useEffect(() => {
    if (!useCamera) return;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, frameRate: 60 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) { console.error(e); }
    };
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [useCamera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
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
      const energyMap = new Float32Array(PROC_WIDTH * PROC_HEIGHT);

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        for (let i = 0; i < data.length; i += 4) {
          const diff = Math.abs(data[i] - prev[i]) + Math.abs(data[i+1] - prev[i+1]) + Math.abs(data[i+2] - prev[i+2]);
          if (diff > 50) energyMap[i >> 2] = diff;
        }
      }
      
      if (!prevFrameRef.current) prevFrameRef.current = new Uint8ClampedArray(data.length);
      prevFrameRef.current.set(data);

      const blurredMap = new Float32Array(PROC_WIDTH * PROC_HEIGHT);
      let maxEnergy = 0;
      let peakX = -1, peakY = -1;

      for (let y = 1; y < PROC_HEIGHT - 1; y++) {
        for (let x = 1; x < PROC_WIDTH - 1; x++) {
          const idx = y * PROC_WIDTH + x;
          let sum = 0;
          for(let ky = -1; ky <= 1; ky++) {
            for(let kx = -1; kx <= 1; kx++) {
              sum += energyMap[(y + ky) * PROC_WIDTH + (x + kx)];
            }
          }

          if (lastRawPos.current.x !== -1) {
            const dx = x - lastRawPos.current.x;
            const dy = y - lastRawPos.current.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 64) { 
              sum *= (1.2 - (distSq / 100)); 
            }
          }

          blurredMap[idx] = sum;
          if (sum > maxEnergy) {
            maxEnergy = sum;
            peakX = x; peakY = y;
          }
        }
      }

      if (maxEnergy > ACTIVATION_ENERGY && peakX !== -1) {
        pointerRef.current.confidence = Math.min(CONFIDENCE_THRESHOLD, pointerRef.current.confidence + 2);
        lastRawPos.current = { x: peakX, y: peakY };
        
        let sumX = 0, sumY = 0, totalWeight = 0;
        const rad = 4;
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const tx = peakX + dx, ty = peakY + dy;
            if (tx >= 0 && tx < PROC_WIDTH && ty >= 0 && ty < PROC_HEIGHT) {
              const e = blurredMap[ty * PROC_WIDTH + tx];
              if (e > 200) {
                const weight = e * e;
                sumX += tx * weight; sumY += ty * weight; totalWeight += weight;
              }
            }
          }
        }

        if (totalWeight > 0) {
          const targetX = (sumX / totalWeight) / PROC_WIDTH * canvas.width;
          const targetY = (sumY / totalWeight) / PROC_HEIGHT * canvas.height;
          
          if (smoothedPos.current.x === -100) {
            smoothedPos.current = { x: targetX, y: targetY };
          } else {
            smoothedPos.current.x += (targetX - smoothedPos.current.x) * SMOOTH_FACTOR;
            smoothedPos.current.y += (targetY - smoothedPos.current.y) * SMOOTH_FACTOR;
          }
          return smoothedPos.current;
        }
      } else {
        pointerRef.current.confidence = Math.max(0, pointerRef.current.confidence - 1);
        if (pointerRef.current.confidence > 0) {
          return smoothedPos.current;
        }
        lastRawPos.current = { x: -1, y: -1 };
      }
      
      return null;
    };

    const loop = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(255, 255, 255, ${1.1 - config.trailPersistence})`; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const pos = trackHand();
      if (pos && (pointerRef.current.confidence > 0)) {
        pointerRef.current.x = pos.x;
        pointerRef.current.y = pos.y;
        pointerRef.current.isDown = true;
      } else if (useCamera) {
        pointerRef.current.isDown = false;
        smoothedPos.current = { x: -100, y: -100 };
      }

      if (pointerRef.current.x !== -100 && pointerRef.current.isDown) {
        trackerPulseRef.current = (trackerPulseRef.current + 0.1) % (Math.PI * 2);
        const pulseSize = Math.sin(trackerPulseRef.current) * 2 + 12;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pointerRef.current.x, pointerRef.current.y, pulseSize, 0, Math.PI * 2);
        const visualConfidence = pointerRef.current.confidence / CONFIDENCE_THRESHOLD;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * visualConfidence})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      particlesRef.current = particlesRef.current.filter(p => {
        const alive = p.update(config.decay, config.gravity);
        if (alive) p.draw(ctx, config.glow);
        return alive;
      });
      ctx.restore();

      if (pointerRef.current.isDown) {
        const dX = pointerRef.current.x - pointerRef.current.lastX;
        const dY = pointerRef.current.y - pointerRef.current.lastY;
        const dist = Math.sqrt(dX * dX + dY * dY);
        
        const steps = pointerRef.current.lastX === -100 ? 1 : Math.max(1, Math.min(15, Math.floor(dist / 4)));
        const densityPerStep = Math.max(1, Math.floor(config.density / 10));

        for (let s = 0; s < steps; s++) {
          const px = pointerRef.current.lastX + (dX * (s / steps));
          const py = pointerRef.current.lastY + (dY * (s / steps));
          particlesRef.current.push(new Particle(px, py, currentTheme, colors.palette, config.speed, config.size, false));
          for (let i = 0; i < densityPerStep; i++) {
            particlesRef.current.push(new Particle(px, py, currentTheme, colors.palette, config.speed, config.size, true));
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
    <div className="relative w-full h-full bg-[#0d0d0d]">
      {/* 
        NEW: Darkened video element for a moody atmosphere while maintaining the stable gray backdrop.
      */}
      {useCamera && (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{
            transform: 'scaleX(-1)',
            filter: 'grayscale(100%) contrast(110%) brightness(75%)',
            opacity: 0.35
          }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
      )}
      
      <canvas ref={processingCanvasRef} width={PROC_WIDTH} height={PROC_HEIGHT} className="hidden" />
      
      <canvas
        ref={canvasRef}
        onPointerMove={e => { if(!useCamera){ pointerRef.current.x = e.clientX; pointerRef.current.y = e.clientY; }}}
        onPointerDown={e => { if(!useCamera){ 
          pointerRef.current.isDown = true; 
          pointerRef.current.x = e.clientX; 
          pointerRef.current.y = e.clientY; 
          pointerRef.current.lastX = e.clientX; 
          pointerRef.current.lastY = e.clientY; 
        }}}
        onPointerUp={() => { if(!useCamera) pointerRef.current.isDown = false; }}
        onPointerLeave={() => { if(!useCamera) { pointerRef.current.x = -100; pointerRef.current.isDown = false; } }}
        className="relative w-full h-full block z-10"
      />
      
      {useCamera && (
        <div className="absolute top-6 left-6 group pointer-events-none z-20">
          <div className="px-4 py-2 border border-white/5 rounded-full bg-black/40 backdrop-blur-sm shadow-2xl">
            <p className="text-[7px] text-white/40 uppercase tracking-[0.4em] animate-pulse">Motion Stream Locked</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticleCanvas;
