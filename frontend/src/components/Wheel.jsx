import { useEffect, useRef, useState, useCallback } from 'react';

// ------------------------------------------------------------------
// HTML5 Canvas Wheel
// - segments drawn with names + rotating colors
// - spin animation with ease-out and real tick sound (Web Audio API)
// - pointer fixed at the top
// ------------------------------------------------------------------

const COLORS = [
  '#f43f5e', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const MAX_SEGMENTS = 60; // wheel visual cap (names list can be larger)

export default function Wheel({ names, onSpin, onFinished, disabled }) {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rotationRef = useRef(0); // current rotation (radians)
  const animRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [segments, setSegments] = useState([]);

  // Keep latest props in refs for the animation loop
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const segs = names.slice(0, MAX_SEGMENTS);
    setSegments(segs);
    rotationRef.current = 0;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    drawWheel(segs, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

  // ---------------- Sound (Web Audio, generated - no files needed) ----------------
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playTick = useCallback(() => {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 850;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }, []);

  const playWinSound = useCallback(() => {
    const ctx = getAudioCtx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.15;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }, []);

  // ---------------- Drawing ----------------
  const drawWheel = useCallback((segs, rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = Math.min(window.innerWidth - 40, 480);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const n = segs.length;

    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ยังไม่มีผู้เข้าร่วม', cx, cy);
      return;
    }

    const segAngle = (Math.PI * 2) / n;

    // Segments
    for (let i = 0; i < n; i++) {
      const start = i * segAngle + rotation;
      const end = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label (rotated text, positioned at segment middle radius)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      const label = segs[i].length > 12 ? `${segs[i].slice(0, 11)}…` : segs[i];
      ctx.fillText(label, radius - 18, 0);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', cx, cy);

    // Pointer at the top
    ctx.save();
    ctx.translate(cx, 4);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }, []);

  // ---------------- Spin animation ----------------
  const spinTo = useCallback(
    async (winnerName) => {
      if (spinning || segments.length === 0) return;
      setSpinning(true);

      const n = segments.length;
      const segAngle = (Math.PI * 2) / n;

      // Target segment: the winner if present, else a random visual segment
      let targetIndex = segments.indexOf(winnerName);
      if (targetIndex === -1) targetIndex = Math.floor(Math.random() * n);

      // Final rotation so the winner segment center lands at the top pointer.
      // Pointer sits at -PI/2, segment i center sits at i*segAngle + segAngle/2 (+ rotation).
      // Solve: rotation + targetCenter === -PI/2 (mod 2PI), then add full turns.
      const targetCenter = targetIndex * segAngle + segAngle / 2;
      const fullTurns = Math.PI * 2 * (5 + Math.floor(Math.random() * 3));
      const base = -Math.PI / 2 - targetCenter;
      const target = rotationRef.current + fullTurns + ((base - rotationRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

      const duration = 5200;
      const startTime = performance.now();
      const startRotation = rotationRef.current;

      let lastSeg = Math.floor(((startRotation + Math.PI / 2) % (Math.PI * 2)) / segAngle);

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // easeOutQuart
        const eased = 1 - Math.pow(1 - t, 4);
        const rotation = startRotation + (target - startRotation) * eased;
        rotationRef.current = rotation;
        drawWheel(segments, rotation);

        // Tick when crossing a segment boundary
        const segNow = Math.floor(((rotation + Math.PI / 2) % (Math.PI * 2)) / segAngle);
        if (segNow !== lastSeg) {
          lastSeg = segNow;
          playTick();
        }

        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          playWinSound();
          setSpinning(false);
          if (onFinishedRef.current) onFinishedRef.current(winnerName);
        }
      };

      animRef.current = requestAnimationFrame(step);
    },
    [spinning, segments, drawWheel, playTick, playWinSound],
  );

  // Expose spinTo to the parent via imperative handle style
  const spinHandler = async () => {
    if (!onSpin || spinning || disabled) return;
    const winnerName = await onSpin();
    if (winnerName) await spinTo(winnerName);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <canvas ref={canvasRef} className="rounded-full shadow-xl" />
      <button
        onClick={spinHandler}
        disabled={spinning || disabled || segments.length === 0}
        className="btn-primary !px-10 !py-3 !text-base"
      >
        {spinning ? '🎡 กำลังหมุน...' : '🎯 หมุนวงล้อ (Spin)'}
      </button>
      {segments.length > 0 && segments.length < names.length && (
        <p className="text-xs text-slate-500">
          แสดง {segments.length} ชื่อบนวงล้อ (จากทั้งหมด {names.length} คน — การสุ่มใช้ทุกคน)
        </p>
      )}
    </div>
  );
}
