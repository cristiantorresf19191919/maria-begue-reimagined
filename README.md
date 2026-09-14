# María Begué — Reimagined

An independent Angular redesign concept inspired by María Begué’s work on personal branding, LinkedIn and personal development.

**Live:** https://maria-begue-reimagined.netlify.app/?lang=es

## Experience

- Responsive editorial design, from 320px phones to wide desktop screens.
- Complete Spanish and English UI, shareable `?lang=es` / `?lang=en` URLs, browser-language detection and persistent preferences.
- Light and dark themes with system preference detection and a pre-render preference script.
- Angular signals and OnPush rendering; CSS entrance animations, intersection-driven reveals and native Angular menu transitions.
- Reduced-motion support, keyboard navigation, skip link, native FAQ disclosures and accessible language/theme controls.
- Optimized WebP photography, explicit image sizing and lazy loading below the fold.
- Official external links for consulting, course enrollment and newsletter signup. No personal data is collected by this concept.

## Development

Requires Node 24.15+ (Node 24 LTS recommended).

```sh
npm ci
npm start -- --port 4217
```

Production build: `npm run build`. Static output: `dist/maria-begue/browser`.

## Verification

```sh
npx playwright install chromium
npm test
```

Start the development server on port 4217 first, or set `SITE_URL` to the deployed origin. The smoke test checks both languages and themes with axe WCAG A/AA rules, preference persistence, eight viewport widths, mobile menu, keyboard/Escape, FAQ, reduced motion, correct official destinations, images and browser exceptions. Screenshots are saved to ignored `artifacts/`.

Automated accessibility checks supplement manual visual and keyboard review; they do not constitute accessibility certification.

## Deployment

The project is configured for Netlify in `netlify.toml`:

```sh
npm run build
netlify link --id eeaab972-68a5-403b-adb3-fd600fbc555e
netlify deploy --prod --dir dist/maria-begue/browser --no-build
```

Production deployment is performed explicitly through the Netlify CLI. GitHub pushes alone do not trigger deployment unless continuous deployment is subsequently connected in Netlify.

## Content and attribution

This is an **independent, unsolicited design concept by Cristian Torres**, not María Begué’s official site and not affiliated with or endorsed by her. It is marked `noindex` to avoid competing with the original website.

Reference pages reviewed on September 14, 2026:

- https://www.mariabegue.me/
- https://www.mariabegue.me/consultorias
- https://www.mariabegue.me/crece-tu-linkedin
- https://www.mariabegue.me/monetiza-tu-linkedin
- https://www.mariabegue.me/suscribete-newsletter

The audience figures reflect the original homepage, not live counters. Current course prices and availability are deliberately left to the official pages. English translations apply to this concept; the linked services and newsletter may be Spanish only.

María’s name and photographs belong to their respective rights holders. Images were sourced from the original Wix-hosted site and optimized to WebP for this concept; they are not offered under a software license. The decorative newsletter card contains newly written illustrative copy, not a claimed quotation or actual newsletter edition. Fonts: DM Sans and Manrope via Google Fonts; Georgia as a system serif.

## Implementation

- `src/app/content.ts`: paired Spanish/English content.
- `src/app/app.ts`: locale, theme and mobile navigation state; reveal lifecycle cleanup.
- `src/app/app.html`: semantic page structure.
- `src/styles.css`: responsive visual system and motion.
- `public/preferences.js`: early theme preference application.
- `scripts/smoke.mjs`: reproducible browser and accessibility checks.
- `LINKEDIN-MESSAGE.md`: suggested Spanish message to María, not sent automatically.
