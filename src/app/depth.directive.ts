import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Pointer-only enhancement; touch, keyboard and reduced motion keep a still surface. */
@Directive({ selector: '[appDepth]' })
export class DepthDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const media = matchMedia(
        '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      );
      const controller = new AbortController();
      let frame = 0;
      let bounds: DOMRect | undefined;
      const reset = () => {
        cancelAnimationFrame(frame);
        bounds = undefined;
        this.element.style.removeProperty('--depth-x');
        this.element.style.removeProperty('--depth-y');
      };
      const enter = () => {
        bounds = this.element.getBoundingClientRect();
      };
      const move = (event: PointerEvent) => {
        if (!media.matches || event.pointerType !== 'mouse' || !bounds) return;
        const x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
        const y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          this.element.style.setProperty('--depth-x', `${-y * 7}deg`);
          this.element.style.setProperty('--depth-y', `${x * 7}deg`);
        });
      };
      this.element.addEventListener('pointerenter', enter, { signal: controller.signal });
      this.element.addEventListener('pointermove', move, {
        passive: true,
        signal: controller.signal,
      });
      this.element.addEventListener('pointerleave', reset, { signal: controller.signal });
      media.addEventListener('change', reset, { signal: controller.signal });
      window.addEventListener('scroll', reset, { passive: true, signal: controller.signal });
      this.destroyRef.onDestroy(() => {
        controller.abort();
        cancelAnimationFrame(frame);
      });
    });
  }
}
