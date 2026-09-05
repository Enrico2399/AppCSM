import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { PopupService } from '../../services/popup/popup.service';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe]
})
export class ForgotPasswordPage {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private popupService = inject(PopupService);
  public i18n = inject(I18nService);

  forgotPasswordForm: FormGroup;
  isLoading = signal(false);
  emailSent = signal(false);

  constructor() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  async onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.emailControl?.markAsTouched();
      return;
    }

    this.isLoading.set(true);
    const loading = await this.loadingCtrl.create({
      message: this.i18n.t('forgotPassword.sending'),
      spinner: 'circles'
    });
    await loading.present();

    try {
      const { email } = this.forgotPasswordForm.value;
      await this.authService.requestPasswordReset(email);
      this.emailSent.set(true);
    } catch (error: any) {
      // Il servizio rilancia solo per problemi di formato/rete: gli altri casi
      // (email non registrata) restano silenziosi per non rivelare chi ha un account.
      this.popupService.showStatus(this.i18n.t('forgotPassword.errorTitle'), error?.message || this.i18n.t('forgotPassword.genericError'));
    } finally {
      await loading.dismiss();
      this.isLoading.set(false);
    }
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}
