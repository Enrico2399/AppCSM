import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { StorageService } from '../../services/storage/storage';

export interface PrivacyConsent {
  analytics: boolean;
  dataProcessing: boolean;
  marketing: boolean;
  cookies: boolean;
  location: boolean;
  consentDate: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

@Component({
  selector: 'app-privacy-consent',
  templateUrl: './privacy-consent.component.html',
  styleUrls: ['./privacy-consent.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class PrivacyConsentComponent {
  private formBuilder = inject(FormBuilder);
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private storageService = inject(StorageService);

  consentForm: FormGroup;
  isLoading = signal(false);
  showDetails = signal(false);
  hasConsented = signal(false);

  constructor() {
    this.consentForm = this.formBuilder.group({
      analytics: [false],
      dataProcessing: [false, Validators.requiredTrue],
      marketing: [false],
      cookies: [false],
      location: [false],
      essential: [true] // Sempre true, non modificabile
    });

    this.checkExistingConsent();
  }

  private async checkExistingConsent() {
    const user = this.authService.user$;
    user.subscribe(async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        try {
          const consent = await this.firebaseService.getPrivacyConsent(currentUser.uid);
          if (consent) {
            this.hasConsented.set(true);
            this.consentForm.patchValue({
              analytics: consent.analytics || false,
              dataProcessing: consent.dataProcessing || false,
              marketing: consent.marketing || false,
              cookies: consent.cookies || false,
              location: consent.location || false
            });
          }
        } catch (error) {
          console.error('Error checking consent:', error);
        }
      }
    });
  }

  async acceptAll() {
    this.consentForm.patchValue({
      analytics: true,
      dataProcessing: true,
      marketing: true,
      cookies: true,
      location: true
    });
    await this.saveConsent();
  }

  async rejectAll() {
    this.consentForm.patchValue({
      analytics: false,
      dataProcessing: true, // Obbligatorio per il funzionamento
      marketing: false,
      cookies: false,
      location: false
    });
    await this.saveConsent();
  }

  async saveConsent() {
    if (this.consentForm.invalid) {
      await this.showError('Devi accettare il trattamento dati essenziale per utilizzare l\'app');
      return;
    }

    this.isLoading.set(true);

    try {
      const user = this.authService.user$;
      const currentUser = await new Promise<any>((resolve) => {
        const subscription = user.subscribe(resolve);
        subscription.unsubscribe();
      });

      if (!currentUser || currentUser.isAnonymous) {
        await this.showError('Utente non autenticato');
        return;
      }

      const consentData: PrivacyConsent = {
        analytics: this.consentForm.value.analytics,
        dataProcessing: this.consentForm.value.dataProcessing,
        marketing: this.consentForm.value.marketing,
        cookies: this.consentForm.value.cookies,
        location: this.consentForm.value.location,
        consentDate: new Date().toISOString(),
        version: '1.0',
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      await this.firebaseService.setPrivacyConsent(currentUser.uid, consentData);
      
      // Salva anche localmente per accesso rapido
      this.storageService.setPrivacyConsent(consentData);

      this.hasConsented.set(true);
      await this.showSuccess('Consenso salvato con successo');

      // Reindirizza alla home se è la prima volta
      if (this.router.url === '/privacy-consent') {
        this.router.navigate(['/home']);
      }

    } catch (error) {
      console.error('Error saving consent:', error);
      await this.showError('Errore nel salvataggio del consenso');
    } finally {
      this.isLoading.set(false);
    }
  }

  async withdrawConsent() {
    const alert = await this.alertCtrl.create({
      header: 'Revoca Consenso',
      message: 'Revocando il consenso, alcuni dati verranno cancellati e alcune funzionalità potrebbero non essere più disponibili. Vuoi procedere?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Revoca',
          role: 'destructive',
          handler: async () => {
            await this.performWithdrawConsent();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performWithdrawConsent() {
    this.isLoading.set(true);

    try {
      const user = this.authService.user$;
      const currentUser = await new Promise<any>((resolve) => {
        const subscription = user.subscribe(resolve);
        subscription.unsubscribe();
      });

      if (!currentUser || currentUser.isAnonymous) {
        await this.showError('Utente non autenticato');
        return;
      }

      // Cancella i dati non essenziali
      await this.firebaseService.clearMoodHistory(currentUser.uid);
      
      // Aggiorna consenso a solo essenziale
      const minimalConsent: PrivacyConsent = {
        analytics: false,
        dataProcessing: true, // Mantieni solo essenziale
        marketing: false,
        cookies: false,
        location: false,
        consentDate: new Date().toISOString(),
        version: '1.0',
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      await this.firebaseService.setPrivacyConsent(currentUser.uid, minimalConsent);
      
      // Aggiorna form
      this.consentForm.patchValue({
        analytics: false,
        dataProcessing: true,
        marketing: false,
        cookies: false,
        location: false
      });

      await this.showSuccess('Consenso revocato. I dati non essenziali sono stati cancellati.');

    } catch (error) {
      console.error('Error withdrawing consent:', error);
      await this.showError('Errore nella revoca del consenso');
    } finally {
      this.isLoading.set(false);
    }
  }

  async requestDeletion() {
    const alert = await this.alertCtrl.create({
      header: 'Richiesta Cancellazione Dati (GDPR)',
      message: 'Questa azione avvierà il processo di cancellazione completa dei tuoi dati come previsto dal GDPR. Riceverai una conferma via email. Vuoi procedere?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Richiedi Cancellazione',
          role: 'destructive',
          handler: async () => {
            await this.performDataDeletion();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performDataDeletion() {
    this.isLoading.set(true);

    try {
      const user = this.authService.user$;
      const currentUser = await new Promise<any>((resolve) => {
        const subscription = user.subscribe(resolve);
        subscription.unsubscribe();
      });

      if (!currentUser || currentUser.isAnonymous) {
        await this.showError('Utente non autenticato');
        return;
      }

      // Log della richiesta di cancellazione
      await this.firebaseService.logError({
        timestamp: new Date().toISOString(),
        message: `Data deletion requested for user: ${currentUser.uid}`,
        stack: '',
        userId: currentUser.uid,
        userAgent: navigator.userAgent,
        url: window.location.href,
        severity: 'high'
      });

      // Cancella tutti i dati utente
      await this.firebaseService.deleteUserData(currentUser.uid);

      // Cancella account Firebase
      await currentUser.delete();

      // Pulizia locale
      this.storageService.clearAllData();

      await this.showSuccess('Richiesta di cancellazione completata. Verrai reindirizzato alla home.');

      // Reindirizza alla home dopo un breve delay
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 2000);

    } catch (error) {
      console.error('Error deleting data:', error);
      await this.showError('Errore nella cancellazione dei dati. Contatta l\'assistenza.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  toggleDetails() {
    this.showDetails.set(!this.showDetails());
  }

  async showPrivacyPolicy() {
    const alert = await this.alertCtrl.create({
      header: 'Privacy Policy Completa',
      message: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; font-size: 0.9rem;">
          <h4>1. Titolare del Trattamento</h4>
          <p>CSM App - Centro Salute Mentale<br>
          Email: privacy@csmapp.it<br>
          PEC: privacy@csmapp.pec.it</p>

          <h4>2. Dati Raccolti</h4>
          <p><strong>Dati Personali:</strong> nome, email, foto profilo<br>
          <strong>Dati di Utilizzo:</strong> stati d'animo, note, messaggi community<br>
          <strong>Dati Tecnici:</strong> IP, user agent, dati dispositivo</p>

          <h4>3. Finalità del Trattamento</h4>
          <p><strong>Essenziale:</strong> funzionamento dell'app, autenticazione<br>
          <strong>Analytics:</strong> statistiche di utilizzo anonime<br>
          <strong>Marketing:</strong> comunicazioni promozionali<br>
          <strong>Cookies:</strong> preferenze, sessione<br>
          <strong>Localizzazione:</strong> servizi basati sulla posizione</p>

          <h4>4. Base Giuridica</h4>
          <p>Consenso dell'interessato, esecuzione del contratto, obblighi legali</p>

          <h4>5. Conservazione</h4>
          <p>Dati personali: 2 anni dalla cancellazione account<br>
          Analytics: 25 mesi<br>
          Log tecnici: 6 mesi</p>

          <h4>6. Diritti dell'Interessato</h4>
          <p>Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, revoca</p>

          <h4>7. Destinatari</h4>
          <p>Firebase (Google), personale autorizzato, fornitori servizi tecnici</p>

          <h4>8. Trasferimento Internazionale</h4>
          <p>I dati sono trattati su server UE/SEE di Firebase</p>
        </div>
      `,
      buttons: ['Chiudi']
    });
    await alert.present();
  }

  private async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showSuccess(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }
}
