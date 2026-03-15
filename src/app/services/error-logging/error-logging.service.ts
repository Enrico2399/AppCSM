import { Injectable } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';
import { environment } from '../../environments/environment';

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack: string;
  userId: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorLoggingService {
  constructor(private firebaseService: FirebaseService) {}

  logError(error: Error, context: string = 'General', severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack || '',
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity
    };

    // Log to Firebase
    this.firebaseService.logError(errorLog);
    
    // Log to console in development
    if (!environment.production) {
      console.error(`[${severity}] ${context}:`, error);
    }
  }

  logUserAction(action: string, details: any = {}) {
    const actionLog = {
      timestamp: new Date().toISOString(),
      action,
      details,
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.firebaseService.logUserAction(actionLog);
  }
}
