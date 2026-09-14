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

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly language = signal<'es' | 'en'>('es');
  readonly dark = signal(false);
  readonly menuOpen = signal(false);
  readonly t = computed(() => content[this.language()]);
  readonly destroyRef = inject(DestroyRef);
  readonly official = 'https://www.mariabegue.me/';

  constructor() {
    afterNextRender(() => {
      const params = new URLSearchParams(location.search);
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
      const onHistory = () =>
        this.setLanguage(
          new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es',
          false,
        );
      window.addEventListener('popstate', onHistory);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('popstate', onHistory);
      });
    });
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
