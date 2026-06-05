'use client';

import { useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { GradientIcon } from './components';
import { agents as items } from './data';

export function AgentsCarousel() {
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const carouselAgents = useMemo(() => [...items, ...items], []);

  const [emblaRef] = useEmblaCarousel(
    {
      align: 'start',
      dragFree: true,
      loop: true,
    },
    reducedMotion
      ? []
      : [
          AutoScroll({
            speed: 0.75,
            startDelay: 0,
            playOnInit: true,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: false,
          }),
        ],
  );

  return (
    <div className="w-full public-carousel-fade">
      <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing public-hide-scrollbar">
        <div className="flex gap-4 px-6 md:px-8 touch-pan-y">
          {carouselAgents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <article
                key={`${agent.title}-${index}`}
                className="group flex h-[320px] w-[clamp(280px,78vw,340px)] flex-shrink-0 select-none flex-col rounded-2xl border border-gray-200 bg-white p-7 text-left shadow-sm transition-all hover:border-purple-200 hover:shadow-md public-card-motion"
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <GradientIcon color="from-purple-500 to-pink-500" className="h-8 w-8 flex-shrink-0 rounded-lg">
                    <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                  </GradientIcon>
                  <span className="text-xs font-medium uppercase tracking-widest text-purple-600">{agent.tag}</span>
                </div>
                <h3 className="mb-3 font-semibold text-gray-900">{agent.title}</h3>
                <p className="mb-5 line-clamp-4 text-sm italic leading-relaxed text-gray-600">{agent.example}</p>
                <ul className="flex-1 space-y-2">
                  {agent.results.slice(0, 2).map((result) => (
                    <li key={result} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" aria-hidden="true" />
                      {result}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cadastro"
                  className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-purple-600 transition-all group-hover:gap-2"
                >
                  Usar assistente <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-gray-400">Arraste para explorar os assistentes</p>
    </div>
  );
}
