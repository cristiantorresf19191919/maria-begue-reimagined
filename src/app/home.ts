import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  afterNextRender,
  DestroyRef,
  inject,
} from '@angular/core';
import { content } from './content';
import { experienceContent } from './experience-content';
import { DepthDirective } from './depth.directive';

@Component({
  selector: 'app-home',
  imports: [DepthDirective],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly language = signal<'es' | 'en'>('es');
  readonly dark = signal(false);
  readonly menuOpen = signal(false);
  readonly t = computed(() => content[this.language()]);
  readonly destroyRef = inject(DestroyRef);
  readonly experience = computed(() => experienceContent[this.language()]);
  readonly selectedGoal = signal(0);
  readonly goal = computed(() => this.experience().goals[this.selectedGoal()]);
  readonly activeSection = signal('');
  readonly showBackToTop = signal(false);
  readonly official = 'https://www.mariabegue.me/';

  constructor() {
    afterNextRender(() => {
      const params = new URLSearchParams(location.search);
      this.restoreGoal();
      const lang =
        params.get('lang') ??
        this.readPreference('mb-language') ??
        (navigator.language.startsWith('es') ? 'es' : 'en');
      this.setLanguage(lang === 'en' ? 'en' : 'es', false);
      const savedTheme = this.readPreference('mb-theme');
      this.dark.set(
        savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches,
      );
      this.applyTheme();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.1 },
      );
      for (const element of document.querySelectorAll('.reveal')) {
        element.classList.add('reveal-ready');
        observer.observe(element);
      }
      const onHistory = () => {
        this.restoreGoal();
        this.setLanguage(
          new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es',
          false,
        );
      };
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('#trabajemos, #sobre-mi, #newsletter'),
      );
      let scrollFrame = 0;
      const updateScroll = () => {
        scrollFrame = 0;
        const distance = document.documentElement.scrollHeight - innerHeight;
        const progress = distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0;
        let current = '';
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= innerHeight * 0.4) current = section.id;
        }
        document.documentElement.style.setProperty('--reading-progress', String(progress));
        this.activeSection.set(current);
        this.showBackToTop.set(scrollY > innerHeight);
      };
      const scheduleScroll = () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
      };
      const resizeObserver = new ResizeObserver(scheduleScroll);
      resizeObserver.observe(document.body);
      window.addEventListener('scroll', scheduleScroll, { passive: true });
      window.addEventListener('resize', scheduleScroll);
      updateScroll();
      window.addEventListener('popstate', onHistory);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        resizeObserver.disconnect();
        cancelAnimationFrame(scrollFrame);
        window.removeEventListener('scroll', scheduleScroll);
        window.removeEventListener('resize', scheduleScroll);
        window.removeEventListener('popstate', onHistory);
      });
    });
  }

  sectionHref(id: string): string {
    const params = new URLSearchParams({ lang: this.language(), goal: this.goal().id });
    return `?${params.toString()}#${id}`;
  }

  courseHref(path: string): string {
    return `/${path}?lang=${this.language()}`;
  }

  goalHref(): string {
    return this.goal().id === 'clarity'
      ? this.goal().href
      : this.courseHref(
          this.goal().id === 'audience' ? 'crece-tu-linkedin' : 'monetiza-tu-linkedin',
        );
  }

  selectGoal(index: number): void {
    this.selectedGoal.set(index);
    const url = new URL(location.href);
    url.searchParams.set('goal', this.goal().id);
    history.pushState({}, '', url);
  }

  private restoreGoal(): void {
    const id = new URLSearchParams(location.search).get('goal');
    const index = this.experience().goals.findIndex((goal) => goal.id === id);
    this.selectedGoal.set(index < 0 ? 0 : index);
  }

  private readPreference(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private savePreference(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Preferences remain available for this visit. */
    }
  }

  setLanguage(language: 'es' | 'en', updateUrl = true): void {
    this.language.set(language);
    document.documentElement.lang = language;
    document.title =
      language === 'es'
        ? 'María Begué — Tu próxima oportunidad empieza en ti | Concepto'
        : 'María Begué — Your next opportunity starts with you | Concept';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        language === 'es'
          ? 'Propuesta independiente de rediseño de la web de María Begué. Marca personal en LinkedIn, formación y nuevas oportunidades.'
          : 'Independent redesign concept for María Begué. LinkedIn personal branding, learning and new opportunities.',
      );
    this.savePreference('mb-language', language);
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    url.searchParams.set('goal', this.goal().id);
    if (updateUrl) {
      history.pushState({}, '', url);
    } else {
      history.replaceState({}, '', url);
    }
  }

  toggleTheme(): void {
    this.dark.update((value) => !value);
    this.applyTheme();
    this.savePreference('mb-theme', this.dark() ? 'dark' : 'light');
  }

  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.dark() ? '#191c19' : '#f7f6f2');
  }

  closeMenu(restoreFocus = false): void {
    this.menuOpen.set(false);
    if (restoreFocus) document.getElementById('menu-toggle')?.focus();
  }
}
