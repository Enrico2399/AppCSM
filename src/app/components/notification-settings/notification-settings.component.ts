import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { NotificationService, NotificationSettings } from '../../services/notifications/notifications.service';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { addIcons } from 'ionicons';
import { notifications, trash, checkmarkCircle, alertCircle, colorPalette, people, barChart, leaf } from 'ionicons/icons';

@Component({
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe]
})
export class NotificationSettingsComponent {
  private notificationService = inject(NotificationService);
  private formBuilder = inject(FormBuilder);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  public i18n = inject(I18nService);

  settingsForm: FormGroup;
  isLoading = signal(false);
  hasPermission = signal(false);
  isInitialized = signal(false);
  scheduledNotifications = signal<any[]>([]);

  constructor() {
    addIcons({ notifications, trash, checkmarkCircle, alertCircle, colorPalette, people, barChart, leaf });
    this.settingsForm = this.formBuilder.group({
      moodReminders: [true],
      communityUpdates: [false],
      weeklyReports: [true],
      groundingReminders: [false],
      reminderTime: ['09:00', [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]]
    });

    this.initializeComponent();
  }

  private async initializeComponent() {
    this.hasPermission.set(this.notificationService.hasPermission());
    this.isInitialized.set(this.notificationService.isInitialized());
    
    if (this.isInitialized()) {
      await this.loadSettings();
      await this.loadScheduledNotifications();
    }
  }

  private async loadSettings() {
    try {
      const settings = await this.notificationService.getNotificationSettings();
      this.settingsForm.patchValue(settings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  private async loadScheduledNotifications() {
    try {
      const notifications = await this.notificationService.getPendingNotifications();
      this.scheduledNotifications.set(notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  }

  async requestPermission() {
    this.isLoading.set(true);
    
    try {
      // Richiede di nuovo i permessi. NotificationService.requestPermissions()
      // prova prima il push (che sul web fallisce sempre, gia' gestito li') e
      // poi le notifiche locali in modo indipendente: qui controlliamo
      // isInitialized(), che riflette le notifiche locali - quelle davvero
      // utilizzabili in questa pagina - non hasPermission(), che riflette solo
      // il push e su web resterebbe false anche a permesso locale concesso.
      await this.notificationService.requestPermissions();

      this.hasPermission.set(this.notificationService.hasPermission());
      this.isInitialized.set(this.notificationService.isInitialized());

      if (this.isInitialized()) {
        await this.showToast(this.i18n.t('notifSettings.enabled'), 'success');
        await this.loadSettings();
      } else {
        await this.showToast(this.i18n.t('notifSettings.permissionDenied'), 'warning');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      await this.showToast(this.i18n.t('notifSettings.permissionRequestError'), 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveSettings() {
    if (this.settingsForm.invalid) {
      await this.showToast(this.i18n.t('notifSettings.fillFields'), 'warning');
      return;
    }

    if (!this.isInitialized()) {
      await this.showToast(this.i18n.t('notifSettings.grantPermissionFirst'), 'warning');
      return;
    }

    this.isLoading.set(true);

    try {
      const settings: NotificationSettings = this.settingsForm.value;
      await this.notificationService.updateNotificationSettings(settings);
      
      // Reload scheduled notifications
      await this.loadScheduledNotifications();
      
      await this.showToast(this.i18n.t('notifSettings.settingsSaved'), 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.showToast(this.i18n.t('notifSettings.saveError'), 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async testNotification() {
    if (!this.isInitialized()) {
      await this.showToast(this.i18n.t('notifSettings.grantPermissionFirst'), 'warning');
      return;
    }

    try {
      await this.notificationService.testNotification();
      await this.showToast(this.i18n.t('notifSettings.testSent'), 'success');
    } catch (error) {
      console.error('Error testing notification:', error);
      await this.showToast(this.i18n.t('notifSettings.testError'), 'danger');
    }
  }

  async clearAllNotifications() {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('notifSettings.clearAllTitle'),
      message: this.i18n.t('notifSettings.clearAllConfirm'),
      buttons: [
        {
          text: this.i18n.t('notifSettings.cancel'),
          role: 'cancel'
        },
        {
          text: this.i18n.t('notifSettings.clear'),
          role: 'destructive',
          handler: async () => {
            await this.performClearNotifications();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performClearNotifications() {
    try {
      await this.notificationService.clearAllScheduledNotifications();
      await this.loadScheduledNotifications();
      await this.showToast(this.i18n.t('notifSettings.cleared'), 'success');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      await this.showToast(this.i18n.t('notifSettings.clearError'), 'danger');
    }
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'mood': 'color-palette',
      'community': 'people',
      'report': 'bar-chart',
      'grounding': 'leaf'
    };
    return icons[type] || 'notifications';
  }

  getNotificationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'mood': this.i18n.t('notifSettings.typeMood'),
      'community': this.i18n.t('notifSettings.typeCommunity'),
      'report': this.i18n.t('notifSettings.typeReport'),
      'grounding': this.i18n.t('notifSettings.typeGrounding')
    };
    return labels[type] || this.i18n.t('notifSettings.typeGeneric');
  }

  formatScheduledTime(date: Date): string {
    return date.toLocaleString(this.i18n.lang() === 'en' ? 'en-US' : 'it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeUntil(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return this.i18n.t('time.expired');
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return this.i18n.t('time.daysHoursShort', { days, hours });
    if (hours > 0) return this.i18n.t('time.hoursMinShort', { hours, minutes });
    return this.i18n.t('time.minShort', { minutes });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
