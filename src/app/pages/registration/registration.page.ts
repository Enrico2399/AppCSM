import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { PopupService } from '../../services/popup/popup.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class RegistrationPage {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private popupService = inject(PopupService);

  registrationForm: FormGroup;
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal<'weak' | 'medium' | 'strong' | null>(null);

  constructor() {
    this.registrationForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Validatore personalizzato per la password
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) {
      this.passwordStrength.set('weak');
      return { weakPassword: true };
    } else if (strength <= 4) {
      this.passwordStrength.set('medium');
      return null;
    } else {
      this.passwordStrength.set('strong');
      return null;
    }
  }

  // Validatore per conferma password
  private passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  get nameControl() { return this.registrationForm.get('name'); }
  get emailControl() { return this.registrationForm.get('email'); }
  get passwordControl() { return this.registrationForm.get('password'); }
  get confirmPasswordControl() { return this.registrationForm.get('confirmPassword'); }
  get termsControl() { return this.registrationForm.get('termsAccepted'); }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  getPasswordStrengthColor(): string {
    const strength = this.passwordStrength();
    switch (strength) {
      case 'weak': return 'danger';
      case 'medium': return 'warning';
      case 'strong': return 'success';
      default: return 'medium';
    }
  }

  getPasswordStrengthText(): string {
    const strength = this.passwordStrength();
    switch (strength) {
      case 'weak': return 'Debole';
      case 'medium': return 'Media';
      case 'strong': return 'Forte';
      default: return '';
    }
  }

  async onSubmit() {
    if (this.registrationForm.invalid) {
      this.markFormGroupTouched(this.registrationForm);
      await this.showError('Per favore compila tutti i campi correttamente');
      return;
    }

    this.isLoading.set(true);

    const loading = await this.loadingCtrl.create({
      message: 'Creazione account in corso...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const { name, email, password } = this.registrationForm.value;
      
      // Registra utente con Firebase
      const result = await this.authService.registerWithEmail(email, password, name);
      
      // Salva preferenze privacy di base
      await this.firebaseService.setPrivacyConsent(result.user.uid, {
        analytics: true,
        dataProcessing: true,
        marketing: false,
        consentDate: new Date().toISOString(),
        version: '1.0'
      });

      await loading.dismiss();
      this.isLoading.set(false);

      // Mostra successo e reindirizza
      await this.showSuccess('Account creato con successo!');
      this.router.navigate(['/home']);

    } catch (error: any) {
      await loading.dismiss();
      this.isLoading.set(false);
      
      let errorMessage = 'Errore durante la registrazione';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email già utilizzata. Prova con un\'altra email o accedi.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La password è troppo debole. Scegli una password più sicura.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email non valida. Controlla l\'indirizzo email.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Problema di connessione. Controlla la tua rete e riprova.';
      }

      await this.showError(errorMessage);
      console.error('Registration error:', error);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  async goToLogin() {
    this.router.navigate(['/login']);
  }

  async showTerms() {
    const alert = await this.alertCtrl.create({
      header: 'Termini e Condizioni',
      message: `
        <div style="text-align: left; max-height: 300px; overflow-y: auto;">
          <h4>1. Accettazione dei Termini</h4>
          <p>Utilizzando questa app, accetti i seguenti termini e condizioni.</p>
          
          <h4>2. Privacy e Dati Personali</h4>
          <p>Raccogliamo e trattiamo i tuoi dati personali in conformità con il GDPR. 
          I tuoi dati sono utilizzati per fornire i servizi dell'app e migliorare l'esperienza utente.</p>
          
          <h4>3. Utilizzo dei Servizi</h4>
          <p>L'app è destinata al supporto del benessere mentale e non sostituisce 
          consulenze mediche professionali.</p>
          
          <h4>4. Contenuti Utente</h4>
          <p>Mantenieni la riservatezza sui tuoi dati e rispetta la privacy degli altri utenti.</p>
          
          <h4>5. Limitazione di Responsabilità</h4>
          <p>Non ci riteniamo responsabili per decisioni prese basandosi sui contenuti dell'app.</p>
        </div>
      `,
      buttons: ['Chiudi']
    });
    await alert.present();
  }

  async showPrivacyPolicy() {
    const alert = await this.alertCtrl.create({
      header: 'Privacy Policy',
      message: `
        <div style="text-align: left; max-height: 300px; overflow-y: auto;">
          <h4>1. Dati Raccolti</h4>
          <p>Raccogliamo: email, nome, stati d'animo, messaggi community, dati di utilizzo.</p>
          
          <h4>2. Finalità</h4>
          <p>I dati sono utilizzati per: fornire i servizi, migliorare l'esperienza, 
          analisi statistiche anonime.</p>
          
          <h4>3. Base Giuridica</h4>
          <p>Il trattamento si basa sul consenso dell'utente e sull'esecuzione del contratto.</p>
          
          <h4>4. Diritti Utente</h4>
          <p>Puoi: accedere, rettificare, cancellare, limitare il trattamento dei tuoi dati.</p>
          
          <h4>5. Conservazione</h4>
          <p>I dati personali sono conservati per il tempo strettamente necessario al servizio.</p>
        </div>
      `,
      buttons: ['Chiudi']
    });
    await alert.present();
  }

  hasMinLength(): boolean {
    const password = this.passwordControl?.value || '';
    return password.length >= 8;
  }

  hasBonusLength(): boolean {
    const password = this.passwordControl?.value || '';
    return password.length >= 12;
  }

  hasUpperAndLower(): boolean {
    const password = this.passwordControl?.value || '';
    return /[a-z]/.test(password) && /[A-Z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.passwordControl?.value || '';
    return /\d/.test(password);
  }

  hasSpecialChars(): boolean {
    const password = this.passwordControl?.value || '';
    return /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  private async showError(message: string) {
    this.popupService.showStatus('Errore', message);
  }

  private async showSuccess(message: string) {
    this.popupService.showStatus('Successo', message);
  }
}
