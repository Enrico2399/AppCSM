import { MoodService, Mood } from '../../services/mood/mood.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { take } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { PopupService } from '../../services/popup/popup.service';

interface CommunityMessage {
  userId: string;
  userName: string;
  moodKey: string;
  message: string;
  timestamp: string;
}

@Component({
  selector: 'app-community',
  templateUrl: './community.page.html',
  styleUrls: ['./community.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CommunityPage implements OnInit, OnDestroy {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  public popupService = inject(PopupService);

  constructor() {
    addIcons({ closeOutline });
  }

  messages = signal<CommunityMessage[]>([]);
  messageInput = signal<string>('');
  selectedMoodKey = signal<string | null>(null);

  private moodService = inject(MoodService);
  moods: Mood[] = this.moodService.getMoods();

  private unsubscribeMessages: (() => void) | null = null;

  ngOnInit() {
    this.unsubscribeMessages = this.firebaseService.listenToCommunityMessages((data) => {
      if (data) {
        const msgs: CommunityMessage[] = Object.values(data);
        msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.messages.set(msgs);
      } else {
        this.messages.set([]);
      }
    });
  }

  ngOnDestroy() {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
    }
  }

  selectMood(key: string) {
    this.selectedMoodKey.set(key);
  }

  sendMessage() {
    const msg = this.messageInput().trim();
    const moodKey = this.selectedMoodKey();

    if (!moodKey) {
      this.popupService.showStatus("Attenzione", "Seleziona un colore...");      return;
    }
    if (!msg) {
      this.showStatus("Attenzione", "Scrivi un messaggio!");
      return;
    }

    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.firebaseService.sendCommunityMessage(
          user.uid,
          user.displayName || "Utente",
          moodKey,
          msg
        );
        this.messageInput.set('');
        this.selectedMoodKey.set(null);
        this.showStatus("Inviato", "Il tuo messaggio è stato pubblicato nella community!");
      } else {
        this.showStatus("Errore", "Devi essere loggato per scrivere nella community.");
      }
    });

    this.popupService.showStatus("Inviato", "Il tuo messaggio è stato pubblicato...");
  }

  showStatus(title: string, message: string) {
    this.popupService.showStatus(title, message);
  }

  closePopup() {
    this.popupService.close();
  }

  getMoodColor(key: string): string {
    return this.moodService.getMoodColor(key);
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }
}
