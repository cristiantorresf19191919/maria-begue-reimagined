import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DepthDirective } from '../depth.directive';
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
    const selection = this.topicControl.valueChanges.subscribe((value) =>
      this.selectTopic(value - 1),
    );
    this.destroyRef.onDestroy(() => selection.unsubscribe());
    afterNextRender(() => {
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
