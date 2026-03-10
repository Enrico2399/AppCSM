import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, Database, query, limitToLast } from 'firebase/database';
import { getAuth, Auth, User } from 'firebase/auth'; // Import User type
import { BehaviorSubject } from 'rxjs'; // Import BehaviorSubject

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: FirebaseApp;
  private db: Database;
  public auth: Auth;

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
    
    // Configura la persistenza locale (browser) in modo esplicito
    import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
      setPersistence(this.auth, browserLocalPersistence);
    });
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

  listenToMoodHistory(userId: string, callback: (history: any) => void) {
    onValue(ref(this.db, 'moodHistory/' + userId), (snapshot) => {
      callback(snapshot.val());
    });
  }

  listenToVotes(callback: (votes: any) => void) {
    onValue(ref(this.db, 'votes'), (snapshot) => {
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

  listenToCommunityMessages(callback: (data: any) => void) {
    const messagesRef = query(ref(this.db, 'communityMessages'), limitToLast(50));
    onValue(messagesRef, (snapshot) => {
      callback(snapshot.val());
    });
  }
}
