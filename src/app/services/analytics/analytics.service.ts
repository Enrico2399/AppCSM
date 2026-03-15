import { Injectable } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';
import { ref, push, set } from 'firebase/database';

export interface AnalyticsEvent {
  eventName: string;
  eventType: 'page_view' | 'user_action' | 'feature_usage' | 'error' | 'performance';
  parameters: { [key: string]: any };
  timestamp: string;
  userId: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private sessionId: string = this.generateSessionId();

  constructor(private firebaseService: FirebaseService) {
    this.trackPageView();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackPageView(pageName?: string) {
    this.logEvent({
      eventName: 'page_view',
      eventType: 'page_view',
      parameters: {
        page_name: pageName || window.location.pathname,
        url: window.location.href,
        referrer: document.referrer
      },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackUserAction(action: string, details: any = {}) {
    this.logEvent({
      eventName: action,
      eventType: 'user_action',
      parameters: details,
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackFeatureUsage(feature: string, action: string, details: any = {}) {
    this.logEvent({
      eventName: `${feature}_${action}`,
      eventType: 'feature_usage',
      parameters: { feature, action, ...details },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackError(error: Error, context: string) {
    this.logEvent({
      eventName: 'error',
      eventType: 'error',
      parameters: {
        error_message: error.message,
        error_stack: error.stack,
        context
      },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackPerformance(metric: string, value: number, details: any = {}) {
    this.logEvent({
      eventName: metric,
      eventType: 'performance',
      parameters: { value, ...details },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  private async logEvent(event: AnalyticsEvent) {
    try {
      const eventRef = push(ref(this.firebaseService['db'], 'analytics'));
      await set(eventRef, event);
    } catch (error) {
      console.error('Analytics logging failed:', error);
    }
  }
}
