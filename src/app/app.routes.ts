import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

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
    path: 'registration',
    loadComponent: () => import('./pages/registration/registration.page').then(m => m.RegistrationPage)
  },
  {
    path: 'firebase-test',
    loadComponent: () => import('./components/firebase-test/firebase-test.component').then(m => m.FirebaseTestComponent)
  },
  {
    path: 'comprehensive-test',
    loadComponent: () => import('./components/comprehensive-test/comprehensive-test.component').then(m => m.ComprehensiveTestComponent)
  },
  {
    path: 'archetipi',
    loadComponent: () => import('./pages/archetipi/archetipi.page').then(m => m.ArchetipiPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map/map.page').then((m) => m.MapPage),
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help.page').then(m => m.HelpPage)
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community.page').then(m => m.CommunityPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'roadmap',
    loadComponent: () => import('./pages/roadmap/roadmap.page').then(m => m.RoadmapPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.page').then(m => m.PrivacyPage)
  },
  {
    path: 'grounding',
    loadComponent: () => import('./pages/grounding/grounding.page').then(m => m.GroundingPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'archetype-quiz',
    loadComponent: () => import('./pages/archetype-quiz/archetype-quiz.page').then(m => m.ArchetypeQuizPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'resources',
    loadComponent: () => import('./pages/resources/resources.page').then(m => m.ResourcesPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];