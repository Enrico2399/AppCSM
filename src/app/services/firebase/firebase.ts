import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  push, 
  Database, 
  query, 
  limitToLast,
  get,
  remove,
  Unsubscribe
} from 'firebase/database';
import { getAuth, Auth, User } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: FirebaseApp;
  private db: Database;
  public auth: Auth;

  getDatabase(): Database {
    return this.db;
  }

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyBiL7kyKVAmujIm3lJ_BZ646YVLVm1QQXY",
      authDomain: "csmtreviso-f59fe.firebaseapp.com",
      databaseURL: "https://csmtreviso-f59fe-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "csmtreviso-f59fe",
      storageBucket: "csmtreviso-f59fe.firebasestorage.app",
      messagingSenderId: "793401975118",
      appId: "1:793401975118:web:86f68532f81604a3fbe396"
    };

    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);
  }

  async setUserConsent(userId: string, consent: boolean): Promise<void> {
    await set(ref(this.db, `consents/${userId}`), {
      consent,
      updatedAt: new Date().toISOString()
    });
  }

  async getUserConsent(userId: string): Promise<boolean> {
    const snapshot = await get(ref(this.db, `consents/${userId}`));
    const val = snapshot.val();
    return !!(val && val.consent);
  }

  async deleteUserData(userId: string): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    // Diario emozionale dell'utente
    tasks.push(remove(ref(this.db, `moodHistory/${userId}`)));

    // Consenso privacy dell'utente
    tasks.push(remove(ref(this.db, `consents/${userId}`)));

    // Profilo archetipo
    tasks.push(remove(ref(this.db, `archetypeProfiles/${userId}`)));

    await Promise.all(tasks);
  }

  async clearMoodHistory(userId: string): Promise<void> {
    await remove(ref(this.db, `moodHistory/${userId}`));
  }

  async upsertUserProfile(user: User): Promise<void> {
    const uid = user.uid;
    const userRef = ref(this.db, `users/${uid}`);

    const snapshot = await get(userRef);
    const existing = snapshot.val() || {};

    const now = new Date();
    const nowIso = now.toISOString();

    // Se l'ultimo accesso risale a più di 3 mesi fa, cancelliamo la cronologia emozionale
    if (existing.lastLoginAt) {
      const lastLogin = new Date(existing.lastLoginAt);
      const diffMs = now.getTime() - lastLogin.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 90) {
        await remove(ref(this.db, `moodHistory/${uid}`));
      }
    }

    const updatePayload = {
      displayName: user.displayName || existing.displayName || null,
      email: user.email || existing.email || null,
      photoURL: user.photoURL || existing.photoURL || null,
      providerId: user.providerData?.[0]?.providerId || existing.providerId || null,
      themePreference: existing.themePreference || null,
      role: existing.role || 'user',
      createdAt: existing.createdAt || nowIso,
      lastLoginAt: nowIso
    };

    await set(userRef, updatePayload);
  }

  voteInFirebase(featureId: string, userName: string) {
    const voteRef = ref(this.db, 'votes/' + featureId);
    
    onValue(voteRef, (snapshot) => {
      const currentVotes = snapshot.val() || 0;
      set(voteRef, currentVotes + 1);
    }, { onlyOnce: true });

    const newLogRef = push(ref(this.db, 'logs'));
    set(newLogRef, {
      user: userName || "Anonimo",
      feature: featureId,
      timestamp: new Date().toISOString()
    });
  }

  logMood(userId: string, moodKey: string, moodTitle: string, icon: string, thought: string = "") {
    const userMoodsRef = push(ref(this.db, 'moodHistory/' + userId));
    set(userMoodsRef, {
      moodKey,
      moodTitle,
      icon,
      thought,
      timestamp: new Date().toISOString()
    });
  }

  listenToMoodHistory(userId: string, callback: (history: any) => void): Unsubscribe {
    return onValue(ref(this.db, 'moodHistory/' + userId), (snapshot) => {
      callback(snapshot.val());
    });
  }

  listenToVotes(callback: (votes: any) => void): Unsubscribe {
    return onValue(ref(this.db, 'votes'), (snapshot) => {
      callback(snapshot.val());
    });
  }

  sendCommunityMessage(userId: string, userName: string, moodKey: string, message: string) {
    const messagesRef = push(ref(this.db, 'communityMessages'));
    set(messagesRef, {
      userId,
      userName,
      moodKey,
      message,
      timestamp: new Date().toISOString()
    });
  }

  listenToCommunityMessages(callback: (data: any) => void): Unsubscribe {
    const messagesRef = query(ref(this.db, 'communityMessages'), limitToLast(20));
    return onValue(messagesRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  sendMapReport(report: any) {
    const reportsRef = push(ref(this.db, 'mapReports'));
    return set(reportsRef, {
      ...report,
      timestamp: new Date().toISOString()
    });
  }

  listenToMapReports(callback: (data: any) => void): Unsubscribe {
    const reportsRef = ref(this.db, 'mapReports');
    return onValue(reportsRef, (snapshot) => {
      callback(snapshot.val());
    });
  }

  // Archetype Quiz Methods
  async saveArchetypeProfile(userId: string, profile: any): Promise<void> {
    await set(ref(this.db, `archetypeProfiles/${userId}`), {
      ...profile,
      updatedAt: new Date().toISOString()
    });
  }

  async getArchetypeProfile(userId: string): Promise<any> {
    const snapshot = await get(ref(this.db, `archetypeProfiles/${userId}`));
    return snapshot.val();
  }

  async updateUserProfile(userId: string, profileData: any): Promise<void> {
    const userRef = ref(this.db, `users/${userId}`);
    const snapshot = await get(userRef);
    const existing = snapshot.val() || {};

    const updatePayload = {
      ...existing,
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    await set(userRef, updatePayload);
  }

  async saveGroundingSession(session: any): Promise<void> {
    const sessionRef = ref(this.db, `groundingSessions/${session.id}`);
    await set(sessionRef, session);
  }

  // Privacy Service Methods
  async setPrivacyConsent(userId: string, consent: any): Promise<void> {
    await set(ref(this.db, `privacyConsents/${userId}`), {
      ...consent,
      updatedAt: new Date().toISOString()
    });
  }

  async getPrivacyConsent(userId: string): Promise<any> {
    const snapshot = await get(ref(this.db, `privacyConsents/${userId}`));
    return snapshot.val();
  }

  async getUserProfile(userId: string): Promise<any> {
    const snapshot = await get(ref(this.db, `users/${userId}`));
    return snapshot.val();
  }

  async saveUserProfile(userId: string, profileData: any): Promise<void> {
    const userRef = ref(this.db, `users/${userId}`);
    const updatePayload = {
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    await set(userRef, updatePayload);
  }

  // Error Logging Methods
  async logError(errorLog: any): Promise<void> {
    const errorRef = push(ref(this.db, 'errorLogs'));
    await set(errorRef, errorLog);
  }

  async logUserAction(actionLog: any): Promise<void> {
    const actionRef = push(ref(this.db, 'userActions'));
    await set(actionRef, actionLog);
  }

  // Performance Monitoring
  async logPerformance(metric: string, value: number, context: any = {}) {
    const perfRef = push(ref(this.db, 'performanceMetrics'));
    await set(perfRef, {
      metric,
      value,
      context,
      timestamp: new Date().toISOString(),
      userId: this.auth.currentUser?.uid || 'anonymous'
    });
  }
}
