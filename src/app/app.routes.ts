import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home').then((m) => m.Home), pathMatch: 'full' },
  {
    path: 'crece-tu-linkedin',
    loadComponent: () => import('./courses/course').then((m) => m.Course),
    data: { course: 'grow' },
  },
  {
    path: 'monetiza-tu-linkedin',
    loadComponent: () => import('./courses/course').then((m) => m.Course),
    data: { course: 'earn' },
  },
  { path: '**', redirectTo: '' },
];
