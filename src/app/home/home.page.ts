import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonAvatar, 
  IonModal,
  IonTitle,
  IonItem,
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logOutOutline, closeOutline } from 'ionicons/icons';
import { StorageService } from '../services/storage/storage';
import { AuthService } from '../services/auth';
import { FirebaseService } from '../services/firebase/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { take, firstValueFrom } from 'rxjs';

interface Mood {
  key: string;
  title: string;
  icon: string;
  psych: string;
  effect: string;
  class: string;
  exercise: string;
}

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
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonAvatar,
    IonModal,
    IonTitle,
    IonItem,
    IonInput
  ]
})
export class HomePage implements OnInit {

  moods = signal<Mood[]>([
    { key: "rosso", title: "Rosso", icon: "🔥", psych: "Passione, Energia / Rabbia, Pericolo", effect: "Aumenta battito cardiaco e adrenalina.", class: "c-rosso", exercise: "Fare 10 saltelli sul posto per scaricare l'energia." },
    { key: "giallo", title: "Giallo", icon: "☀️", psych: "Felicità, Ottimismo / Ansia, Frustrazione", effect: "Stimola la mente e la concentrazione.", class: "c-giallo", exercise: "Scrivi 3 cose per cui sei grato oggi." },
    { key: "blu", title: "Blu", icon: "🌊", psych: "Calma, Fiducia / Freddezza, Malinconia", effect: "Riduce la pressione e favorisce il relax.", class: "c-blu", exercise: "Segui il respiro: inspira per 4 secondi, espira per 6." },
    { key: "verde", title: "Verde", icon: "🌿", psych: "Armonia, Crescita / Invidia, Noia", effect: "Riduce lo stress, favorisce l'equilibrio.", class: "c-verde", exercise: "Guarda fuori dalla finestra per 2 minuti cercando il verde." },
    { key: "arancio", title: "Arancione", icon: "🍊", psych: "Entusiasmo, Socievolezza / Impulsività", effect: "Stimola la creatività e la socializzazione.", class: "c-arancio", exercise: "Chiama o scrivi un messaggio a un amico che non senti da tempo." },
    { key: "viola", title: "Viola", icon: "🔮", psych: "Spiritualità, Mistero / Solitudine", effect: "Stimola l'immaginazione e calma la mente.", class: "c-viola", exercise: "Disegna una forma astratta senza staccare la penna dal foglio." },
    { key: "bianco", title: "Bianco", icon: "☁️", psych: "Purezza, Semplicità / Isolamento", effect: "Crea sensazione di spazio e chiarezza.", class: "c-bianco", exercise: "Chiudi gli occhi e visualizza una stanza vuota e luminosa." },
    { key: "nero", title: "Nero", icon: "🎱", psych: "Eleganza, Potere / Oppressione, Paura", effect: "Comunica autorità e definisce i confini.", class: "c-nero", exercise: "Scrivi su un foglio una paura e poi strappalo." },
    { key: "grigio", title: "Grigio", icon: "🌪️", psych: "Neutralità, Equilibrio / Monotonia", effect: "Riduce gli stimoli, crea stabilità.", class: "c-grigio", exercise: "Riordina 5 oggetti sulla tua riflessione per ritrovare ordine." }
  ]);

  activeMood = signal<Mood | null>(null);
  
  angleStep = computed(() => 360 / this.moods().length);

  communityTips = signal<string[]>([]);
  newTip = signal<string>('');
  moodNote = signal<string>('');

  isPopupOpen = signal<boolean>(false);
  popupTitle = signal<string>('');
  popupDesc = signal<string>('');

  // Auth fields
  email = signal<string>('');
  password = signal<string>('');
  name = signal<string>('');
  isRegistering = signal<boolean>(false);
  authMethod = signal<'email' | 'phone'>('email');

  // Phone Auth
  phone = signal<string>('');
  otp = signal<string>('');
  showOtpInput = signal<boolean>(false);
  confirmationResult: ConfirmationResult | null = null;
  recaptchaVerifier: any;
  isLightMode = signal<boolean>(false);

  // Privacy & consenso
  hasConsent = signal<boolean | null>(null);
  showConsentModal = signal<boolean>(false);

  constructor(
    private storageService: StorageService,
    public authService: AuthService,
    private firebaseService: FirebaseService
  ) {
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

    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.hasConsent.set(null);
        return;
      }
      this.firebaseService.getUserConsent(user.uid).then(consent => {
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

    this.authService.user$.pipe(take(1)).subscribe(user => {
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

    this.authService.user$.pipe(take(1)).subscribe(user => {
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

  getMoodColor(className: string): string {
    const colors: Record<string, string> = {
      'c-rosso': '#e74c3c',
      'c-giallo': '#f1c40f',
      'c-blu': '#3498db',
      'c-verde': '#2ecc71',
      'c-arancio': '#e67e22',
      'c-viola': '#9b59b6',
      'c-bianco': '#ecf0f1',
      'c-nero': '#2c3e50',
      'c-grigio': '#95a5a6'
    };
    return colors[className] || 'var(--bg-dark)';
  }

  loadTips() {
    const color = this.activeMood()?.key;
    this.communityTips.set(this.storageService.getCommunityTips(color));
  }

  isSeededTip(tip: string): boolean {
    const color = this.activeMood()?.key;
    if (!color) return false;
    const defaults = (this.storageService as any).getDefaultTips?.(color) || [];
    return defaults.includes(tip);
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
    this.popupTitle.set(mood.title);
    this.popupDesc.set(mood.psych);
    this.isPopupOpen.set(true);
  }

  closePopup() {
    this.isPopupOpen.set(false);
  }

  showStatus(title: string, message: string) {
    this.popupTitle.set(title);
    this.popupDesc.set(message);
    this.isPopupOpen.set(true);
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
      await this.firebaseService.setUserConsent(user.uid, true);
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
    } catch (err: any) {
      this.showStatus("Errore Accesso", err.message);
    }
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