'use client';

import { useEffect, useRef } from 'react';

type BlogMetricEventType =
  | 'post_impression'
  | 'post_click'
  | 'post_view'
  | 'post_read_time'
  | 'post_cta_click';

type BlogMetricPayload = {
  eventType: BlogMetricEventType;
  postId?: string;
  slug?: string;
  path?: string;
  label?: string;
  target?: string;
  durationSeconds?: number;
};

function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
  if (configured.trim()) return configured.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return '';
}

function sendMetric(payload: BlogMetricPayload, useBeacon = false) {
  const baseUrl = apiBaseUrl();
  const url = `${baseUrl}/blog/metrics/events`;
  const body = JSON.stringify({
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...payload,
  });

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function BlogListMetrics() {
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-blog-post-card]'));
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          const postId = element.dataset.postId || '';
          const slug = element.dataset.postSlug || '';
          const key = postId || slug;
          if (!key || seenRef.current.has(key)) return;
          seenRef.current.add(key);
          sendMetric({ eventType: 'post_impression', postId, slug });
          observer.unobserve(element);
        });
      },
      { threshold: 0.35 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return null;
}

export function BlogPostClickTracker({
  postId,
  slug,
  children,
}: {
  postId: string;
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <span
      onClick={() => sendMetric({ eventType: 'post_click', postId, slug, target: `/blog/${slug}`, label: 'Ler artigo' })}
      className="contents"
    >
      {children}
    </span>
  );
}

export function BlogArticleMetrics({ postId, slug }: { postId: string; slug: string }) {
  const startRef = useRef(Date.now());
  const sentReadTimeRef = useRef(false);

  useEffect(() => {
    sendMetric({ eventType: 'post_view', postId, slug });

    function sendReadTime() {
      if (sentReadTimeRef.current) return;
      sentReadTimeRef.current = true;
      const durationSeconds = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      sendMetric({ eventType: 'post_read_time', postId, slug, durationSeconds }, true);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const clickable = target?.closest('a,button') as HTMLElement | null;
      if (!clickable) return;
      sendMetric({
        eventType: 'post_cta_click',
        postId,
        slug,
        label: clickable.textContent?.trim().slice(0, 120) || clickable.getAttribute('aria-label') || '',
        target: clickable.getAttribute('href') || clickable.getAttribute('data-href') || '',
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') sendReadTime();
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', sendReadTime);

    return () => {
      sendReadTime();
      document.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', sendReadTime);
    };
  }, [postId, slug]);

  return null;
}
