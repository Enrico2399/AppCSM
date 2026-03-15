import { Injectable, signal } from '@angular/core';
import { StorageService } from '../storage/storage';

export interface AnonymousSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  hasSeenWelcome: boolean;
  data: {
    helpPreferences?: any;
    moodHistory?: any[];
    profileData?: any;
    helpComponents?: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnonymousSessionService {
  private currentSession = signal<AnonymousSession | null>(null);
  private readonly SESSION_DURATION_HOURS = 24;

  constructor(private storageService: StorageService) {}

  // Crea nuova sessione anonima
  createSession(): AnonymousSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));
    
    const session: AnonymousSession = {
      id: this.generateSessionId(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hasSeenWelcome: false,
      data: {}
    };

    this.saveSession(session);
    return session;
  }

  // Carica sessione esistente
  loadSession(): AnonymousSession | null {
    const session = this.storageService.getAnonymousSession();
    
    if (session && !this.isExpired(session)) {
      this.currentSession.set(session);
      return session;
    } else if (session && this.isExpired(session)) {
      this.cleanupExpiredSession();
    }
    
    return null;
  }

  // Salva sessione corrente
  saveSession(session: AnonymousSession): void {
    this.storageService.setAnonymousSession(session);
    this.currentSession.set(session);
  }

  // Aggiorna dati della sessione
  updateSessionData(data: Partial<AnonymousSession['data']>): void {
    const session = this.currentSession();
    if (!session) return;

    const updatedSession = {
      ...session,
      data: {
        ...session.data,
        ...data
      }
    };

    this.saveSession(updatedSession);
  }

  // Marca welcome come visto
  markWelcomeSeen(): void {
    const session = this.currentSession();
    if (!session) return;

    session.hasSeenWelcome = true;
    this.saveSession(session);
  }

  // Controlla se deve mostrare welcome
  shouldShowWelcome(): boolean {
    const session = this.currentSession();
    return session ? !session.hasSeenWelcome : false;
  }

  // Verifica se sessione è valida
  isSessionValid(): boolean {
    const session = this.currentSession();
    return session ? !this.isExpired(session) : false;
  }

  // Controlla se sessione è in scadenza (mostra warning)
  isSessionExpiringSoon(): boolean {
    const session = this.currentSession();
    if (!session) return false;

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Mostra warning se mancano meno di 2 ore
    return timeUntilExpiry <= (2 * 60 * 60 * 1000) && timeUntilExpiry > 0;
  }

  // Tempo rimanente
  getTimeRemaining(): string {
    const session = this.currentSession();
    if (!session) return '';

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (now >= expiresAt) return 'Scaduta';

    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Cleanup sessione scaduta
  cleanupExpiredSession(): void {
    this.storageService.removeAnonymousSession();
    this.currentSession.set(null);
  }

  // Verifica se sessione è scaduta
  private isExpired(session: AnonymousSession): boolean {
    return new Date() >= new Date(session.expiresAt);
  }

  // Genera ID sessione
  private generateSessionId(): string {
    return `anon_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Ottieni sessione corrente
  getCurrentSession() {
    return this.currentSession.asReadonly();
  }
}
