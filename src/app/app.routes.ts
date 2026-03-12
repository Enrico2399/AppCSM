import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'map',    loadComponent: () => import('./pages/map/map.page').then((m) => m.MapPage),
  },
  {
    path: 'archetipi',
    loadComponent: () => import('./pages/archetipi/archetipi.page').then( m => m.ArchetipiPage)
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help.page').then( m => m.HelpPage)
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community.page').then(m => m.CommunityPage)
  },
  {
    path: 'roadmap',
    loadComponent: () => import('./pages/roadmap/roadmap.page').then( m => m.RoadmapPage)
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then( m => m.HistoryPage)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.page').then( m => m.PrivacyPage)
  },
];