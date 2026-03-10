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
    onAuthStateChanged(this.firebaseService.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(this.firebaseService.auth, provider);
    } catch (error) {
      console.error("Errore Google Login:", error);
      throw error;
    }
  }

  async loginWithEmail(email: string, pass: string) {
    return await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
  }

  async registerWithEmail(email: string, pass: string, name: string) {
    const res = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
    }
    return res;
  }

  async logout() {
    await signOut(this.firebaseService.auth);
  }

  async loginAnonymously() {
    return await signInAnonymously(this.firebaseService.auth);
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