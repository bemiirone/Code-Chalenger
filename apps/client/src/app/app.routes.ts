import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'challenge/:id',
    canActivate: [authGuard],
    // Monaco Editor is loaded lazily inside this route's component
    loadComponent: () =>
      import('./features/challenge/challenge-runner.component').then(
        (m) => m.ChallengeRunnerComponent,
      ),
  },
  {
    path: 'results/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/results/results.component').then((m) => m.ResultsComponent),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
