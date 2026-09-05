import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { PopupService } from '../../services/popup/popup.service';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe]
})
export class RegistrationPage {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private popupService = inject(PopupService);
  public i18n = inject(I18nService);

  registrationForm: FormGroup;
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal<'weak' | 'medium' | 'strong' | null>(null);

  constructor() {
    addIcons({ eye, eyeOff });
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
      case 'weak': return this.i18n.t('registration.strengthWeak');
      case 'medium': return this.i18n.t('registration.strengthMedium');
      case 'strong': return this.i18n.t('registration.strengthStrong');
      default: return '';
    }
  }

  async onSubmit() {
    if (this.registrationForm.invalid) {
      this.markFormGroupTouched(this.registrationForm);
      await this.showError(this.i18n.t('registration.fillAllFields'));
      return;
    }

    this.isLoading.set(true);

    const loading = await this.loadingCtrl.create({
      message: this.i18n.t('registration.creatingAccount'),
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
      await this.showSuccess(this.i18n.t('registration.accountCreated'));
      this.router.navigate(['/home']);

    } catch (error: any) {
      await loading.dismiss();
      this.isLoading.set(false);
      
      let errorMessage = this.i18n.t('registration.genericError');
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = this.i18n.t('registration.emailInUse');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = this.i18n.t('registration.weakPasswordError');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = this.i18n.t('registration.invalidEmail');
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = this.i18n.t('registration.networkError');
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
      header: this.i18n.t('registration.termsTitle'),
      message: `<div style="text-align: left; max-height: 300px; overflow-y: auto;">${this.i18n.t('registration.termsBody')}</div>`,
      buttons: [this.i18n.t('registration.close')]
    });
    await alert.present();
  }

  async showPrivacyPolicy() {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('registration.privacyTitle'),
      message: `<div style="text-align: left; max-height: 300px; overflow-y: auto;">${this.i18n.t('registration.privacyBody')}</div>`,
      buttons: [this.i18n.t('registration.close')]
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
    this.popupService.showStatus(this.i18n.t('registration.errorTitle'), message);
  }

  private async showSuccess(message: string) {
    this.popupService.showStatus(this.i18n.t('registration.successTitle'), message);
  }
}
