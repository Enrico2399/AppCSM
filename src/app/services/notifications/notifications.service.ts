import { Injectable, signal, inject } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FirebaseService } from '../firebase/firebase';
import { AuthService } from '../auth';
import { take } from 'rxjs';

export interface NotificationSettings {
  moodReminders: boolean;
  communityUpdates: boolean;
  weeklyReports: boolean;
  groundingReminders: boolean;
  reminderTime: string; // HH:mm format
}

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduledTime: Date;
  type: 'mood' | 'community' | 'report' | 'grounding';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  hasPermission = signal<boolean>(false);
  isInitialized = signal<boolean>(false);
  scheduledNotifications = signal<ScheduledNotification[]>([]);

  constructor() {
    this.initializeNotifications();
  }

  private async initializeNotifications() {
    try {
      // Request permission for push notifications
      const permissionResult = await PushNotifications.requestPermissions();
      this.hasPermission.set(permissionResult.receive === 'granted');

      if (this.hasPermission()) {
        await PushNotifications.register();
        this.setupNotificationListeners();
        this.isInitialized.set(true);
      }

      // Initialize local notifications
      await LocalNotifications.requestPermissions();

    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.isInitialized.set(false);
    }
  }

  private setupNotificationListeners() {
    // Listen for incoming push notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      this.handleIncomingNotification(notification);
    });

    // Listen for notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification tapped:', notification);
      this.handleNotificationTap(notification);
    });

    // Listen for local notification tap
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Local notification tapped:', notification);
      this.handleLocalNotificationTap(notification);
    });
  }

  private handleIncomingNotification(notification: any) {
    // Handle incoming push notification when app is in foreground
    const { title, body } = notification;
    
    // Show local notification as fallback
    this.showLocalNotification(title, body, 'push');
  }

  private handleNotificationTap(notification: any) {
    // Handle notification tap - navigate to relevant page
    const data = notification.notification.data;
    
    if (data?.type) {
      this.navigateToNotificationTarget(data.type, data);
    }
  }

  private handleLocalNotificationTap(notification: any) {
    // Handle local notification tap
    const data = notification.notification.data;
    
    if (data?.type) {
      this.navigateToNotificationTarget(data.type, data);
    }
  }

  private navigateToNotificationTarget(type: string, data: any) {
    // Navigation logic based on notification type
    switch (type) {
      case 'mood':
        // Navigate to home page for mood tracking
        window.location.href = '/home';
        break;
      case 'community':
        // Navigate to community page
        window.location.href = '/community';
        break;
      case 'report':
        // Navigate to history page
        window.location.href = '/history';
        break;
      case 'grounding':
        // Navigate to grounding page
        window.location.href = '/grounding';
        break;
      default:
        // Default to home
        window.location.href = '/home';
    }
  }

  async scheduleNotification(settings: NotificationSettings) {
    if (!this.isInitialized()) {
      console.warn('Notifications not initialized');
      return;
    }

    // Clear existing notifications
    await this.clearAllScheduledNotifications();

    const notifications: ScheduledNotification[] = [];

    // Schedule mood reminders
    if (settings.moodReminders) {
      const moodNotification = this.createMoodReminder(settings.reminderTime);
      notifications.push(moodNotification);
      await this.scheduleLocalNotification(moodNotification);
    }

    // Schedule grounding reminders
    if (settings.groundingReminders) {
      const groundingNotification = this.createGroundingReminder(settings.reminderTime);
      notifications.push(groundingNotification);
      await this.scheduleLocalNotification(groundingNotification);
    }

    // Schedule weekly report
    if (settings.weeklyReports) {
      const weeklyNotification = this.createWeeklyReportReminder();
      notifications.push(weeklyNotification);
      await this.scheduleLocalNotification(weeklyNotification);
    }

    this.scheduledNotifications.set(notifications);
  }

  private createMoodReminder(time: string): ScheduledNotification {
    const scheduledTime = this.getNextOccurrence(time);
    return {
      id: Date.now(),
      title: '🎨 Come ti senti oggi?',
      body: 'Prendi un momento per registrare il tuo stato d\'animo e tracciare il tuo benessere.',
      scheduledTime,
      type: 'mood'
    };
  }

  private createGroundingReminder(time: string): ScheduledNotification {
    const scheduledTime = this.getNextOccurrence(time, 2); // 2 hours after mood reminder
    return {
      id: Date.now() + 1,
      title: '🧘 Momento di relax',
      body: 'Fai una pausa e prova un esercizio di grounding per ricentrarti.',
      scheduledTime,
      type: 'grounding'
    };
  }

  private createWeeklyReportReminder(): ScheduledNotification {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
    nextSunday.setHours(10, 0, 0, 0); // 10 AM on Sunday

    return {
      id: Date.now() + 2,
      title: '📊 Il tuo report settimanale',
      body: 'Scopri le tendenze del tuo benessere mentale questa settimana.',
      scheduledTime: nextSunday,
      type: 'report'
    };
  }

  private getNextOccurrence(time: string, hoursOffset = 0): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours + hoursOffset, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    return scheduledTime;
  }

  private async scheduleLocalNotification(notification: ScheduledNotification) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notification.id,
          title: notification.title,
          body: notification.body,
          schedule: { at: notification.scheduledTime },
          sound: 'default'
        }]
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async clearAllScheduledNotifications() {
    try {
      await LocalNotifications.cancel({
        notifications: this.scheduledNotifications().map(n => ({ id: n.id }))
      });
      this.scheduledNotifications.set([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async showImmediateNotification(title: string, body: string, type: 'mood' | 'community' | 'report' | 'grounding' = 'mood') {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
          sound: 'default'
        }]
      });
    } catch (error) {
      console.error('Error showing immediate notification:', error);
    }
  }

  private async showLocalNotification(title: string, body: string, type: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default'
        }]
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  async sendCommunityUpdate(message: string) {
    // This would typically be called from a backend service
    // For now, we'll show it as a local notification
    await this.showImmediateNotification(
      '🌟 Nuovo nella Community',
      message,
      'community'
    );
  }

  async sendWeeklyReport() {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      // Get user's mood statistics
      const moodHistory = await this.firebaseService.getMoodHistory(user.uid);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyData = moodHistory.filter(log => new Date(log.timestamp) >= weekAgo);

      if (weeklyData.length > 0) {
        const moodCounts = weeklyData.reduce((acc, log) => {
          const mood = log.moodKey || log.mood;
          acc[mood] = (acc[mood] || 0) + 1;
          return acc;
        }, {});

        const dominantMood = Object.entries(moodCounts).reduce((a, b) => 
          moodCounts[a[0] as string] > moodCounts[b[0] as string] ? a : b
        )[0];

        const moodEmojis: Record<string, string> = {
          'rosso': '🔥',
          'giallo': '☀️',
          'blu': '🌊',
          'verde': '🌿',
          'arancio': '🍊',
          'viola': '🔮',
          'bianco': '☁️',
          'nero': '🎱',
          'grigio': '🌪️'
        };

        await this.showImmediateNotification(
          '📊 Il tuo report settimanale',
          `Questa settimana il tuo umore dominante è stato ${moodEmojis[dominantMood] || '📊'} ${dominantMood}. Hai registrato ${weeklyData.length} stati d'animo.`,
          'report'
        );
      }
    } catch (error) {
      console.error('Error sending weekly report:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) {
      return this.getDefaultSettings();
    }

    try {
      const profile = await this.firebaseService.getUserProfile(user.uid);
      return profile?.preferences?.notifications || this.getDefaultSettings();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      moodReminders: true,
      communityUpdates: false,
      weeklyReports: true,
      groundingReminders: false,
      reminderTime: '09:00'
    };
  }

  async updateNotificationSettings(settings: NotificationSettings) {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (!user) return;

    try {
      // Update user profile with notification settings
      await this.firebaseService.updateUserProfile(user.uid, {
        preferences: {
          notifications: settings
        }
      });

      // Reschedule notifications with new settings
      await this.scheduleNotification(settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  async testNotification() {
    await this.showImmediateNotification(
      '🔔 Notifica di Test',
      'Questa è una notifica di test per verificare che il sistema funzioni correttamente.',
      'mood'
    );
  }

  async getPendingNotifications(): Promise<ScheduledNotification[]> {
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduledTime: new Date(n.schedule?.at || Date.now()),
        type: 'mood' // Default type since data is not available
      }));
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }
}
