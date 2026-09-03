import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase/firebase';
import { AnonymousSessionService } from './anonymous-session/anonymous-session.service';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload
} from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private anonymousSessionService = inject(AnonymousSessionService);
  private userSubject = new BehaviorSubject<User | null>(null);
  
  user$ = this.userSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.firebaseService.auth, async (user) => {
      if (user) {
        try {
          await this.firebaseService.upsertUserProfile(user);
        } catch (error) {
          console.error('Errore aggiornando il profilo utente in Firebase', error);
        }
      }
      this.userSubject.next(user);
    });
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(this.firebaseService.auth, provider);
      if (res.user) {
        await this.firebaseService.upsertUserProfile(res.user);
      }
      return res;
    } catch (error) {
      console.error("Errore Google Login:", error);
      throw error;
    }
  }

  async loginWithEmail(email: string, pass: string) {
    const res = await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
    if (res.user) {
      await this.firebaseService.upsertUserProfile(res.user);
    }
    return res;
  }

  async registerWithEmail(email: string, pass: string, name: string) {
    const res = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
      await this.firebaseService.upsertUserProfile(res.user);
      await sendEmailVerification(res.user);
    }
    return res;
  }

  /** Invia l'email di reset password. */
  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new Error('Inserisci un indirizzo email valido.');
    }
    try {
      await sendPasswordResetEmail(this.firebaseService.auth, normalized);
    } catch (error: any) {
      // Non rilanciamo per 'utente non trovato': rivelarlo permetterebbe di
      // scoprire quali email sono registrate. Solo i problemi di formato/rete
      // vanno mostrati davvero all'utente.
      const revealable = ['auth/invalid-email', 'auth/too-many-requests', 'auth/network-request-failed'];
      if (revealable.includes(error?.code)) {
        throw new Error(this.mapAuthError(error));
      }
    }
  }

  /** Rimanda l'email di verifica all'utente attualmente loggato. */
  async resendVerificationEmail(): Promise<void> {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) {
      throw new Error('Devi effettuare il login per verificare la tua email.');
    }
    if (currentUser.emailVerified) {
      return;
    }
    try {
      await sendEmailVerification(currentUser);
    } catch (error: any) {
      throw new Error(this.mapAuthError(error));
    }
  }

  /** Ricontrolla lo stato di verifica dell'email dopo che l'utente ha cliccato il link. */
  async refreshEmailVerified(): Promise<boolean> {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) {
      return false;
    }
    await reload(currentUser);
    return currentUser.emailVerified;
  }

  private mapAuthError(error: any): string {
    switch (error?.code) {
      case 'auth/invalid-email':
        return 'Email non valida. Controlla l\'indirizzo inserito.';
      case 'auth/too-many-requests':
        return 'Troppi tentativi. Riprova tra qualche minuto.';
      case 'auth/network-request-failed':
        return 'Problema di connessione. Controlla la tua rete e riprova.';
      default:
        return "Si e' verificato un errore. Riprova piu' tardi.";
    }
  }

  async logout() {
    await signOut(this.firebaseService.auth);
  }

  async loginAnonymously() {
    const res = await signInAnonymously(this.firebaseService.auth);
    if (res.user) {
      await this.firebaseService.upsertUserProfile(res.user);
      
      // Crea sessione anonima
      const session = this.anonymousSessionService.createSession();
      await this.anonymousSessionService.saveSessionToFirebase(res.user.uid, session);
    }
    return res;
  }

  setupRecaptcha(containerId: string) {
    return new RecaptchaVerifier(this.firebaseService.auth, containerId, {
      size: 'invisible'
    });
  }

  async loginWithPhone(phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> {
    return await signInWithPhoneNumber(this.firebaseService.auth, phoneNumber, appVerifier);
  }
}