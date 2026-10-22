import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { PublicLayout } from './layouts/public-layout/public-layout';

const SITE = 'Kandy Day Trip Planner';

export const routes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        title: `Admin sign-in | ${SITE}`,
        loadComponent: () => import('./features/admin/admin-login/admin-login'),
      },
      {
        path: '',
        canActivate: [adminAuthGuard],
        loadComponent: () => import('./features/admin/admin-layout/admin-layout'),
        children: [
          {
            path: '',
            title: `Admin dashboard | ${SITE}`,
            loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard'),
          },
          {
            path: 'attractions',
            title: `Manage attractions | ${SITE}`,
            loadComponent: () => import('./features/admin/manage-attractions/manage-attractions'),
          },
          {
            path: 'attractions/new',
            title: `Add attraction | ${SITE}`,
            loadComponent: () => import('./features/admin/attraction-form/attraction-form'),
          },
          {
            path: 'attractions/:id/edit',
            title: `Edit attraction | ${SITE}`,
            loadComponent: () => import('./features/admin/attraction-form/attraction-form'),
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        title: `${SITE} | Discover Kandy, your way`,
        loadComponent: () => import('./features/home/home'),
      },
      {
        path: 'explore',
        title: `Explore attractions | ${SITE}`,
        loadComponent: () => import('./features/explore/explore'),
      },
      {
        path: 'attractions/:slug',
        title: `Attraction | ${SITE}`,
        loadComponent: () => import('./features/attraction-details/attraction-details'),
      },
      {
        path: 'my-plan',
        title: `My Plan | ${SITE}`,
        loadComponent: () => import('./features/my-plan/my-plan'),
      },
      {
        path: 'about',
        title: `About Kandy | ${SITE}`,
        loadComponent: () => import('./features/about/about'),
      },
      {
        path: 'contact',
        title: `Contact | ${SITE}`,
        loadComponent: () => import('./features/contact/contact'),
      },
      {
        path: '**',
        title: `Page not found | ${SITE}`,
        loadComponent: () => import('./features/not-found/not-found'),
      },
    ],
  },
];
