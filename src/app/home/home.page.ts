import { MoodService, Mood } from '../services/mood/mood.service';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent,
  IonIcon, 
  IonModal,
  IonItem,
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logOutOutline, closeOutline } from 'ionicons/icons';
import { StorageService } from '../services/storage/storage';
import { AuthService } from '../services/auth';
import { FirebaseService } from '../services/firebase/firebase';
import { ConfirmationResult, User } from 'firebase/auth';
import { take, firstValueFrom } from 'rxjs';
import { PopupService } from '../services/popup/popup.service';
import { AnonymousSessionService } from '../services/anonymous-session/anonymous-session.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    FormsModule,
    RouterModule,
    IonContent,
    IonIcon,
    IonModal,
    IonItem,
    IonInput
  ]
})
export class HomePage implements OnInit {

  moods = signal<Mood[]>([]);
  
  activeMood = signal<Mood | null>(null);
  
  angleStep = computed(() => 360 / this.moods().length);

  communityTips = signal<string[]>([]);
  newTip = signal<string>('');
  moodNote = signal<string>('');

  isLightMode = signal<boolean>(false);

  // Privacy & consenso
  hasConsent = signal<boolean | null>(null);
  showConsentModal = signal<boolean>(false);

  // Auth fields
  email = signal<string>('');
  password = signal<string>('');
  name = signal<string>('');
  isRegistering = signal<boolean>(false);
  
  phone = signal<string>('');
  otp = signal<string>('');
  showOtpInput = signal<boolean>(false);
  authMethod = signal<'email' | 'phone'>('email');
  
  recaptchaVerifier: any;
  confirmationResult: ConfirmationResult | null = null;

  constructor(
    private moodService: MoodService,
    private storageService: StorageService,
    public authService: AuthService,
    private firebaseService: FirebaseService,
    public popupService: PopupService,
    private anonymousSessionService: AnonymousSessionService
  ) {
    this.moods.set(this.moodService.getMoods());
    addIcons({ logoGoogle, logOutOutline, closeOutline });
  }

  ngOnInit() {
    this.loadTips();
    this.isLightMode.set(document.body.classList.contains('light-theme'));

    window.addEventListener('resetMoodWheel', () => {
      this.goHome();
    });

    window.addEventListener('themeChanged', () => {
      this.isLightMode.set(document.body.classList.contains('light-theme'));
    });

    this.authService.user$.pipe(take(1)).subscribe((user: User | null) => {
      if (!user) {
        this.hasConsent.set(null);
        // Don't show welcome popup here - only after actual anonymous login
        return;
      }
      this.firebaseService.getUserConsent(user.uid).then((consent: boolean) => {
        this.hasConsent.set(consent);
        if (!consent) {
          this.showConsentModal.set(true);
        }
      });
    });
  }

  getSliceTransform(index: number): string {
    const angle = index * this.angleStep();
    return `rotate(${angle}deg) skewY(${90 - this.angleStep()}deg)`;
  }

  getContentTransform(index: number): string {
    const angle = index * this.angleStep();
    return `rotate(-${angle}deg) skewY(-${90 - this.angleStep()}deg) translate(100px, 100px)`;
  }

  selectMood(mood: Mood) {
    this.activeMood.set(mood);
    this.moodNote.set(''); // Clear note when switching moods
    this.loadTips();
  }

  saveMoodLog() {
    if (this.hasConsent() === false) {
      this.showStatus("Privacy", "Per salvare i tuoi dati devi prima accettare l'informativa privacy.");
      return;
    }
    const mood = this.activeMood();
    if (!mood) return;

    const note = this.moodNote().trim();
    if (!note) {
      this.showStatus("Attenzione", "Inserisci il tuo pensiero o registra il tuo stato d'animo direttamente.");
      return;
    }

    this.authService.user$.pipe(take(1)).subscribe((user: User | null) => {
      if (user) {
        this.firebaseService.logMood(user.uid, mood.key, mood.title, mood.icon, note);
        this.showStatus("Registrato", "Stato d'animo registrato nella tua cronologia!");
        this.moodNote.set('');
      } else {
        this.showStatus("Errore", "Devi essere loggato per salvare nel diario.");
      }
    });
  }

  quickSaveMoodLog() {
    if (this.hasConsent() === false) {
      this.showStatus("Privacy", "Per registrare le emozioni devi prima accettare l'informativa privacy.");
      return;
    }
    const mood = this.activeMood();
    if (!mood) return;

    this.authService.user$.pipe(take(1)).subscribe((user: User | null) => {
      if (user) {
        this.firebaseService.logMood(user.uid, mood.key, mood.title, mood.icon, "");
        this.showStatus("Registrato", "Emozione registrata istantaneamente!");
      } else {
        this.showStatus("Errore", "Devi essere loggato per registrare le emozioni.");
      }
    });
  }

  goHome() {
    this.activeMood.set(null);
    this.loadTips();
  }

  getMoodColor(key: string): string {
    return this.moodService.getMoodColor(key) || 'var(--bg-dark)';
  }

  loadTips() {
    const color = this.activeMood()?.key;
    this.communityTips.set(this.storageService.getCommunityTips(color));
  }

  isSeededTip(tip: string): boolean {
    const color = this.activeMood()?.key;
    if (!color) return false;
    return this.storageService.getDefaultTips(color).includes(tip);
  }

  addTip() {
    const tip = this.newTip().trim();
    if (tip !== '') {
      const color = this.activeMood()?.key;
      this.storageService.addCommunityTip(tip, color);
      this.newTip.set('');
      this.loadTips();
    }
  }

  removeTip(tip: string) {
    if (this.isSeededTip(tip)) return;
    const color = this.activeMood()?.key;
    this.storageService.removeCommunityTip(tip, color);
    this.loadTips();
  }

  openPopup(mood: Mood) {
    this.popupService.showStatus(mood.title, mood.psych);
  }

  closePopup() {
    this.popupService.close();
  }

  showStatus(title: string, message: string) {
    this.popupService.showStatus(title, message);
  }

  async handleLogin() {
    try {
      await this.authService.loginWithGoogle();
    } catch (err) {
      console.error("Login failed", err);
    }
  }

  async handleLogout() {
    try {
      await this.authService.logout();
    } catch (err) {
      console.error("Logout failed", err);
    }
  }

  async acceptConsent() {
    try {
      const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
      if (!user) {
        return;
      }
      await this.firebaseService.setUserConsent((user as any).uid, true);
      this.hasConsent.set(true);
      this.showConsentModal.set(false);
    } catch (err) {
      console.error("Errore salvataggio consenso", err);
      this.showStatus("Errore", "Non è stato possibile salvare il consenso. Riprova più tardi.");
    }
  }

  async declineConsent() {
    // Se l'utente non accetta il consenso, lo disconnettiamo e chiudiamo l'accesso al diario
    await this.handleLogout();
    this.hasConsent.set(false);
    this.showConsentModal.set(false);
  }

  async handleEmailLogin() {
    try {
      await this.authService.loginWithEmail(this.email(), this.password());
    } catch (err: any) {
      this.showStatus("Errore Login", err.message);
    }
  }

  async handleRegister() {
    try {
      await this.authService.registerWithEmail(this.email(), this.password(), this.name());
    } catch (err: any) {
      this.showStatus("Errore Registrazione", err.message);
    }
  }

  toggleAuthMode() {
    this.isRegistering.update(v => !v);
  }

  toggleTheme() {
    const newMode = !this.isLightMode();
    this.isLightMode.set(newMode);
    if (newMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
    window.dispatchEvent(new Event('themeChanged'));
  }

  async handleAnonymousLogin() {
    try {
      await this.authService.loginAnonymously();
      // Create or load anonymous session
      const session = this.anonymousSessionService.loadSession();
      if (!session) {
        this.anonymousSessionService.createSession();
      }
      // Check if should show welcome popup
      if (this.anonymousSessionService.shouldShowWelcome()) {
        this.showAnonymousWelcome();
      }
    } catch (err: any) {
      this.showStatus("Errore Accesso", err.message);
    }
  }

  handleAnonymousSession() {
    const session = this.anonymousSessionService.loadSession();
    if (!session) {
      this.anonymousSessionService.createSession();
    }
    // Check if should show welcome popup
    if (this.anonymousSessionService.shouldShowWelcome()) {
      this.showAnonymousWelcome();
    }
  }

  showAnonymousWelcome() {
    this.popupService.showStatus(
      "Sessione Anonima", 
      "I tuoi dati saranno cancellati dopo 24 ore, poiché sei in anonimo."
    );
    this.anonymousSessionService.markWelcomeSeen();
  }

  async handlePhoneLogin() {
    try {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = this.authService.setupRecaptcha('recaptcha-container');
      }
      this.confirmationResult = await this.authService.loginWithPhone(this.phone(), this.recaptchaVerifier);
      this.showOtpInput.set(true);
      this.showStatus("SMS Inviato", "Codice inviato via SMS!");
    } catch (err: any) {
      this.showStatus("Errore SMS", err.message);
    }
  }

  async handleVerifyOtp() {
    try {
      if (this.confirmationResult) {
        await this.confirmationResult.confirm(this.otp());
      }
    } catch (err: any) {
      this.showStatus("Errore Codice", err.message);
    }
  }
}