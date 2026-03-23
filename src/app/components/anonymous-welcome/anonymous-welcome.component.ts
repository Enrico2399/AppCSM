import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';

@Component({
  selector: 'app-anonymous-welcome',
  templateUrl: './anonymous-welcome.component.html',
  styleUrls: ['./anonymous-welcome.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AnonymousWelcomeComponent implements OnInit, OnDestroy {
  isOpen = signal<boolean>(false);
  session = signal<any>(null);
  
  timeRemaining = computed(() => {
    const sess = this.session();
    if (!sess) return '';
    
    const now = new Date();
    const expiresAt = new Date(sess.expiresAt);
    
    if (now >= expiresAt) return 'Sessione scaduta';
    
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  });

  constructor(private anonymousSessionService: AnonymousSessionService, private router: Router) {}

  ngOnInit() {
    this.session.set(this.anonymousSessionService.getCurrentSession());
    
    // Mostra popup se è la prima volta
    if (this.anonymousSessionService.shouldShowWelcome()) {
      this.isOpen.set(true);
    }
  }

  ngOnDestroy() {
    // Cleanup se necessario
  }

  closeWelcome() {
    this.isOpen.set(false);
    this.anonymousSessionService.markWelcomeSeen();
  }

  extendSession() {
    const currentSession = this.session();
    if (!currentSession) return;

    // Estendi sessione di altre 24 ore
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);
    
    const extendedSession = {
      ...currentSession,
      expiresAt: newExpiresAt.toISOString()
    };

    this.anonymousSessionService.saveSession(extendedSession);
    this.session.set(extendedSession);
  }

  createAccount() {
    this.router.navigate(['/registration']);
    this.closeWelcome();
  }
}
