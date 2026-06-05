'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type IntroSlide = {
  eyebrow: string;
  title: string;
  gradient?: string;
  description?: string;
};

type Firefly = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  hue: number;
};

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

export function IntroSequence({
  slides,
  storageKey,
  once = false,
}: {
  slides: IntroSlide[];
  storageKey?: string;
  once?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const lastAdvanceRef = useRef(-Infinity);
  const touchStartRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (once && storageKey) {
      try {
        if (window.localStorage?.getItem(storageKey) === 'seen') {
          document.documentElement.setAttribute('data-public-intro-active', 'false');
          setDismissed(true);
          return;
        }
      } catch {
        // Storage can be unavailable in restricted browser contexts; the intro should still render.
      }
    }

    setVisible(true);
  }, [once, storageKey]);

  useLayoutEffect(() => {
    if (dismissed) {
      document.documentElement.setAttribute('data-public-intro-active', 'false');
      return;
    }

    document.documentElement.setAttribute('data-public-intro-active', 'true');
    return () => document.documentElement.removeAttribute('data-public-intro-active');
  }, [dismissed]);

  const finish = useCallback(() => {
    document.documentElement.setAttribute('data-public-intro-active', 'false');
    setLeaving(true);
    if (once && storageKey) {
      try {
        window.localStorage?.setItem(storageKey, 'seen');
      } catch {
        // Ignore storage failures; the visible transition is more important than persistence.
      }
    }
    window.setTimeout(() => setDismissed(true), 950);
  }, [once, storageKey]);

  const advance = useCallback(() => {
    const now = performance.now();
    if (now - lastAdvanceRef.current < 320 || leaving || dismissed) return;
    lastAdvanceRef.current = now;

    setIndex((current) => {
      if (current >= slides.length - 1) {
        finish();
        return current;
      }
      return current + 1;
    });
  }, [dismissed, finish, leaving, slides.length]);

  const retreat = useCallback(() => {
    const now = performance.now();
    if (now - lastAdvanceRef.current < 320 || leaving || dismissed) return;
    lastAdvanceRef.current = now;
    setIndex((current) => Math.max(0, current - 1));
  }, [dismissed, leaving]);

  useEffect(() => {
    if (dismissed) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY > 8) advance();
      if (event.deltaY < -8) retreat();
    };

    const onClick = () => {
      advance();
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const end = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - end;
      if (delta > 28) advance();
      if (delta < -28) retreat();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('click', onClick);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [advance, dismissed, retreat]);

  useEffect(() => {
    if (dismissed) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let fireflies: Firefly[] = [];

    const resize = () => {
      const scale = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);

      const random = seededRandom(20260605);
      const count = Math.max(70, Math.min(150, Math.floor((width * height) / 11000)));
      fireflies = Array.from({ length: count }, () => {
        const x = random() * width;
        const y = random() * height;
        return {
          x,
          y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          radius: random() * 1.9 + 0.7,
          alpha: random() * 0.34 + 0.14,
          phase: random() * Math.PI * 2,
          hue: 260 + random() * 58,
        };
      });
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#0a0514';
      context.fillRect(0, 0, width, height);

      const orbA = context.createRadialGradient(width * 0.2, height * 0.28, 0, width * 0.2, height * 0.28, width * 0.42);
      orbA.addColorStop(0, 'rgba(126, 34, 206, 0.22)');
      orbA.addColorStop(1, 'rgba(126, 34, 206, 0)');
      context.fillStyle = orbA;
      context.fillRect(0, 0, width, height);

      const orbB = context.createRadialGradient(width * 0.78, height * 0.6, 0, width * 0.78, height * 0.6, width * 0.36);
      orbB.addColorStop(0, 'rgba(219, 39, 119, 0.18)');
      orbB.addColorStop(1, 'rgba(219, 39, 119, 0)');
      context.fillStyle = orbB;
      context.fillRect(0, 0, width, height);

      for (const point of fireflies) {
        point.baseX += point.vx;
        point.baseY += point.vy;
        if (point.baseX < -24) point.baseX = width + 24;
        if (point.baseX > width + 24) point.baseX = -24;
        if (point.baseY < -24) point.baseY = height + 24;
        if (point.baseY > height + 24) point.baseY = -24;

        const dx = point.baseX - mouseRef.current.x;
        const dy = point.baseY - mouseRef.current.y;
        const distance = Math.hypot(dx, dy);
        const influence = mouseRef.current.active ? Math.max(0, 1 - distance / 170) : 0;
        const push = influence * 34;
        const angle = Math.atan2(dy, dx);
        point.x += (point.baseX + Math.cos(angle) * push - point.x) * 0.045;
        point.y += (point.baseY + Math.sin(angle) * push - point.y) * 0.045;

        const blink = Math.sin(time * 0.0012 + point.phase) * 0.5 + 0.5;
        const alpha = point.alpha * (0.28 + blink * 0.72) + influence * 0.32;
        const radius = point.radius + influence * 2.2;
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 7);
        glow.addColorStop(0, `hsla(${point.hue}, 90%, 76%, ${alpha})`);
        glow.addColorStop(0.34, `hsla(${point.hue}, 88%, 68%, ${alpha * 0.34})`);
        glow.addColorStop(1, `hsla(${point.hue}, 88%, 68%, 0)`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(point.x, point.y, radius * 7, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY, active: true };
    };

    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden text-white transition-opacity duration-1000 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={advance}
      role="presentation"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(10,5,20,0.38))]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center select-none md:px-8">
        {slides.map((slide, slideIndex) => (
          <section
            key={`${slide.eyebrow}-${slide.title}`}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              slideIndex === index && visible && !leaving
                ? 'opacity-100'
                : 'opacity-0'
            }`}
            aria-hidden={slideIndex !== index}
          >
            <p className="absolute left-1/2 top-[calc(50%-7.25rem)] w-full -translate-x-1/2 px-6 text-[10px] uppercase tracking-[0.3em] text-white/55 md:top-[calc(50%-8.5rem)] md:text-sm">
              {slide.eyebrow}
            </p>
            <h1 className="absolute left-1/2 top-1/2 mx-auto grid w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 place-content-center gap-1 px-6 text-balance text-[clamp(1.7rem,4.4vw,3.9rem)] font-bold leading-[1.08] text-white">
              <span>{slide.title}</span>
              <span className="bg-gradient-to-r from-violet-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                {slide.gradient}
              </span>
            </h1>
            {slide.description ? (
              <p className="absolute left-1/2 top-[calc(50%+6.25rem)] mx-auto w-full max-w-2xl -translate-x-1/2 px-6 text-base leading-relaxed text-white/45 md:top-[calc(50%+7.5rem)] md:text-lg">
                {slide.description}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      <p className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-xs uppercase tracking-[0.24em] text-white/35">
        Role para continuar
      </p>
    </div>
  );
}
