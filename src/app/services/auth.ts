import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase/firebase';
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
  ConfirmationResult
} from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebaseService = inject(FirebaseService);
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
    }
    return res;
  }

  async logout() {
    await signOut(this.firebaseService.auth);
  }

  async loginAnonymously() {
    const res = await signInAnonymously(this.firebaseService.auth);
    if (res.user) {
      await this.firebaseService.upsertUserProfile(res.user);
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