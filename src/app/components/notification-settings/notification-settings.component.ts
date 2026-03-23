import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { NotificationService, NotificationSettings } from '../../services/notifications/notifications.service';

@Component({
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class NotificationSettingsComponent {
  private notificationService = inject(NotificationService);
  private formBuilder = inject(FormBuilder);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  settingsForm: FormGroup;
  isLoading = signal(false);
  hasPermission = signal(false);
  isInitialized = signal(false);
  scheduledNotifications = signal<any[]>([]);

  constructor() {
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
      // Re-initialize notifications to request permission
      await this.notificationService.initializeNotifications();
      
      this.hasPermission.set(this.notificationService.hasPermission());
      this.isInitialized.set(this.notificationService.isInitialized());
      
      if (this.hasPermission()) {
        await this.showToast('Permessi notifiche concessi!', 'success');
        await this.loadSettings();
      } else {
        await this.showToast('Permessi notifiche negati. Attivali dalle impostazioni del dispositivo.', 'warning');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      await this.showToast('Errore nella richiesta dei permessi', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveSettings() {
    if (this.settingsForm.invalid) {
      await this.showToast('Compila tutti i campi correttamente', 'warning');
      return;
    }

    if (!this.hasPermission()) {
      await this.showToast('Concedi prima i permessi per le notifiche', 'warning');
      return;
    }

    this.isLoading.set(true);

    try {
      const settings: NotificationSettings = this.settingsForm.value;
      await this.notificationService.updateNotificationSettings(settings);
      
      // Reload scheduled notifications
      await this.loadScheduledNotifications();
      
      await this.showToast('Impostazioni notifiche salvate!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.showToast('Errore nel salvataggio delle impostazioni', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async testNotification() {
    if (!this.hasPermission()) {
      await this.showToast('Concedi prima i permessi per le notifiche', 'warning');
      return;
    }

    try {
      await this.notificationService.testNotification();
      await this.showToast('Notifica di test inviata!', 'success');
    } catch (error) {
      console.error('Error testing notification:', error);
      await this.showToast('Errore nell\'invio della notifica di test', 'danger');
    }
  }

  async clearAllNotifications() {
    const alert = await this.alertCtrl.create({
      header: 'Cancella Tutte le Notifiche',
      message: 'Questa azione cancellerà tutte le notifiche programmate. Vuoi procedere?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Cancella',
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
      await this.showToast('Notifiche cancellate', 'success');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      await this.showToast('Errore nella cancellazione delle notifiche', 'danger');
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
      'mood': 'Promemoria Umore',
      'community': 'Aggiornamenti Community',
      'report': 'Report Settimanale',
      'grounding': 'Esercizi Grounding'
    };
    return labels[type] || 'Notifica';
  }

  formatScheduledTime(date: Date): string {
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeUntil(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Scaduto';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}g ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
