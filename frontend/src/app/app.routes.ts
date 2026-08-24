import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then(
        m => m.OnboardingComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        m => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'submissions',
    loadComponent: () =>
      import('./features/submissions/submissions.component').then(
        m => m.SubmissionsComponent
      ),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./features/create-form/create-form.component').then(
        m => m.CreateFormComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'forms/:id',
    loadComponent: () =>
      import('./features/form-detail/form-detail.component').then(
        m => m.FormDetailComponent
      ),
    canActivate: [authGuard],
  },
  // Rota para preenchimento do formulário — criada por Gabriela
  // Acessada após clicar em "Preencher" na tela de detalhes do formulário
  {
    path: 'forms/:id/fill',
    loadComponent: () =>
      import('./features/form-fill/form-fill').then(
        m => m.FormFillComponent
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];