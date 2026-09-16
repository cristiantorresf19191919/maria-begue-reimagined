import { DestroyRef, Injectable, inject } from '@angular/core';

/** Reveals the actual new page snapshot, so text and surfaces change together. */
@Injectable({ providedIn: 'root' })
export class ThemeTransition {
  private active: ViewTransition | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    const stop = () => {
      if (this.reduced.matches) this.active?.skipTransition();
    };
    this.reduced.addEventListener('change', stop);
    inject(DestroyRef).onDestroy(() => {
      this.reduced.removeEventListener('change', stop);
      this.active?.skipTransition();
    });
  }

  reveal(event: Event, update: () => void): void {
    const origin = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const rect = origin?.getBoundingClientRect();
    const pointer = event instanceof MouseEvent && event.detail > 0;
    const x = pointer ? event.clientX : rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const y = pointer ? event.clientY : rect ? rect.top + rect.height / 2 : innerHeight / 2;
    // Preserve every toggle, even when another snapshot is still being captured.
    this.active?.skipTransition();
    this.queue = this.queue
      .then(async () => {
        this.active?.skipTransition();
        if (!document.startViewTransition || this.reduced.matches) {
          update();
          return;
        }
        const root = document.documentElement;
        const radius = Math.ceil(
          Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)),
        );
        root.style.setProperty('--theme-origin-x', `${x}px`);
        root.style.setProperty('--theme-origin-y', `${y}px`);
        root.style.setProperty('--theme-radius', `${radius}px`);
        root.classList.add('theme-reveal-active');
        const transition = document.startViewTransition(update);
        this.active = transition;
        const cleanup = () => {
          if (this.active === transition) {
            this.active = null;
            root.classList.remove('theme-reveal-active');
          }
        };
        void transition.finished.then(cleanup, cleanup);
        void transition.ready
          .then(() => {
            if (this.reduced.matches || this.active !== transition) {
              transition.skipTransition();
              return;
            }
          })
          .catch(() => {
            /* A skipped snapshot still applies the theme update. */
          });
        await transition.updateCallbackDone;
      })
      .catch(() => {
        /* Keep subsequent toggles usable if a snapshot is interrupted. */
      });
  }
}
