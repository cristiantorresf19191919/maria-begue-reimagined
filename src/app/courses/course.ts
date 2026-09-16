import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DepthDirective } from '../depth.directive';
import { courseDepth } from './course-depth';
import { courseTestimonials } from './course-testimonials';
import { courseContent } from './course-content';
import type { CourseKind, Language } from './course-content';

@Component({
  selector: 'app-course',
  imports: [DepthDirective, ReactiveFormsModule],
  templateUrl: './course.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Course {
  readonly kind: CourseKind =
    inject(ActivatedRoute).snapshot.data['course'] === 'earn' ? 'earn' : 'grow';
  readonly language = signal<Language>('es');
  readonly dark = signal(false);
  readonly menuOpen = signal(false);
  readonly selectedTopic = signal(0);
  readonly topicControl = new FormControl(1, { nonNullable: true });
  readonly dock = signal(false);
  readonly depth = computed(() => courseDepth[this.language()]);
  readonly detail = computed(() => this.depth()[this.kind]);
  readonly testimonials = courseTestimonials[this.kind];
  readonly testimonialIndex = signal(0);
  readonly testimonial = computed(() => this.testimonials[this.testimonialIndex()]);
  private returnFocus: HTMLElement | null = null;
  private previousOverflow = '';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private motionFrame = 0;
  private slideAnimations: Animation[] = [];
  private touchOrigin: { x: number; y: number } | null = null;
  private suppressClickUntil = 0;

  changeTestimonial(direction: number): void {
    this.selectTestimonial(
      (this.testimonialIndex() + direction + this.testimonials.length) % this.testimonials.length,
      direction,
    );
  }
  selectTestimonial(index: number, direction = index > this.testimonialIndex() ? 1 : -1): void {
    if (index === this.testimonialIndex()) return;
    this.testimonialIndex.set(index);
    cancelAnimationFrame(this.motionFrame);
    for (const animation of this.slideAnimations) animation.cancel();
    this.slideAnimations = [];
    this.motionFrame = requestAnimationFrame(() => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const root = this.host.nativeElement;
      const strip = root.querySelector<HTMLElement>('.proof-thumbnails');
      const selected = strip?.querySelector<HTMLElement>(`button:nth-child(${index + 1})`);
      if (strip && selected) {
        strip.scrollTo({
          left:
            strip.scrollLeft +
            selected.getBoundingClientRect().left -
            strip.getBoundingClientRect().left -
            (strip.clientWidth - selected.offsetWidth) / 2,
          behavior: reduced ? 'instant' : 'smooth',
        });
      }
      if (reduced) return;
      const targets = root.querySelectorAll<HTMLElement>(
        '.proof-image img, .proof-caption h3, .proof-caption > p[lang], dialog[open] > img',
      );
      for (const [order, target] of Array.from(targets).entries()) {
        const isImage = target.tagName === 'IMG';
        this.slideAnimations.push(
          target.animate(
            [
              {
                opacity: 0,
                transform: `translate3d(${direction * (isImage ? 44 : 18)}px, ${isImage ? 0 : 8}px, 0) scale(${isImage ? 0.965 : 1})`,
              },
              { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
            ],
            {
              duration: isImage ? 480 : 360,
              delay: isImage ? 0 : order * 30,
              easing: 'cubic-bezier(.16, 1, .3, 1)',
              fill: 'backwards',
            },
          ),
        );
      }
    });
  }
  startSwipe(event: TouchEvent): void {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    this.touchOrigin = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  cancelSwipe(): void {
    this.touchOrigin = null;
  }
  endSwipe(event: TouchEvent): void {
    const origin = this.touchOrigin;
    this.touchOrigin = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      this.suppressClickUntil = performance.now() + 500;
      this.changeTestimonial(dx < 0 ? 1 : -1);
    }
  }
  openTestimonial(dialog: HTMLDialogElement, event: Event): void {
    if (
      event instanceof MouseEvent &&
      event.detail !== 0 &&
      performance.now() < this.suppressClickUntil
    )
      return;
    this.returnFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }
  closeTestimonial(): void {
    document.body.style.overflow = this.previousOverflow;
    this.returnFocus?.focus();
  }
  readonly t = computed(() => courseContent[this.language()]);
  readonly course = computed(() => this.t()[this.kind]);
  readonly topic = computed(() => this.course().topics[this.selectedTopic()]);
  readonly price = computed(() =>
    new Intl.NumberFormat(this.language() === 'es' ? 'es-ES' : 'en-IE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(this.course().price),
  );
  readonly official = computed(() => `https://www.mariabegue.me/${this.course().path}`);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.motionFrame);
      for (const animation of this.slideAnimations) animation.cancel();
      if (document.querySelector('dialog[open]'))
        document.body.style.overflow = this.previousOverflow;
    });
    const selection = this.topicControl.valueChanges.subscribe((value) =>
      this.selectTopic(value - 1),
    );
    this.destroyRef.onDestroy(() => selection.unsubscribe());
    afterNextRender(() => {
      const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
      const stopMotion = () => {
        if (motionPreference.matches)
          for (const animation of this.slideAnimations) animation.cancel();
      };
      motionPreference.addEventListener('change', stopMotion);
      this.destroyRef.onDestroy(() => motionPreference.removeEventListener('change', stopMotion));
      this.syncUrl();
      const saved = this.read('mb-theme');
      this.dark.set(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
      this.applyTheme();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
        },
        { threshold: 0.08 },
      );
      for (const node of document.querySelectorAll('.course-reveal')) {
        node.classList.add('motion-ready');
        observer.observe(node);
      }
      let frame = 0;
      const update = () => {
        frame = 0;
        const distance = document.documentElement.scrollHeight - innerHeight;
        const final = document.querySelector('.final-offer')?.getBoundingClientRect();
        this.dock.set(scrollY > 600 && (final ? final.top > innerHeight : true));
        document.documentElement.style.setProperty(
          '--reading-progress',
          String(distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0),
        );
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      const resize = new ResizeObserver(schedule);
      resize.observe(document.body);
      const history = () => this.syncUrl();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      window.addEventListener('popstate', history);
      update();
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        resize.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('popstate', history);
      });
    });
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  private save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Preference is kept for this visit. */
    }
  }
  private syncUrl(): void {
    const params = new URLSearchParams(location.search);
    const lang =
      params.get('lang') ??
      this.read('mb-language') ??
      (navigator.language.startsWith('es') ? 'es' : 'en');
    const topic = Number(params.get('topic') ?? 1);
    this.selectedTopic.set(Number.isInteger(topic) && topic >= 1 && topic <= 3 ? topic - 1 : 0);
    this.topicControl.setValue(this.selectedTopic() + 1, { emitEvent: false });
    this.setLanguage(lang === 'en' ? 'en' : 'es', false);
  }
  setLanguage(language: Language, push = true): void {
    this.language.set(language);
    this.save('mb-language', language);
    document.documentElement.lang = language;
    document.title = `${this.course().title} — María Begué | ${language === 'es' ? 'Concepto' : 'Concept'}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', this.course().intro);
    this.updateUrl(push);
  }
  selectTopic(index: number): void {
    this.selectedTopic.set(index);
    this.updateUrl(true);
  }
  private updateUrl(push: boolean): void {
    const url = new URL(location.href);
    url.searchParams.set('lang', this.language());
    url.searchParams.set('topic', String(this.selectedTopic() + 1));
    if (push) history.pushState({}, '', url);
    else history.replaceState({}, '', url);
  }
  href(section: string): string {
    return `/${this.course().path}?lang=${this.language()}&topic=${this.selectedTopic() + 1}#${section}`;
  }
  homeHref(section = ''): string {
    return `/?lang=${this.language()}#${section}`;
  }
  otherHref(): string {
    return `/${this.course().otherPath}?lang=${this.language()}`;
  }
  toggleTheme(): void {
    this.dark.update((value) => !value);
    this.applyTheme();
    this.save('mb-theme', this.dark() ? 'dark' : 'light');
  }
  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.dark() ? '#191c19' : '#f7f6f2');
  }
  closeMenu(focus = false): void {
    this.menuOpen.set(false);
    if (focus) document.getElementById('course-menu-toggle')?.focus();
  }
}
