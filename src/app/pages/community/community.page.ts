import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { take } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

interface CommunityMessage {
  userId: string;
  userName: string;
  moodKey: string;
  message: string;
  timestamp: string;
}

interface MoodOption {
  key: string;
  title: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-community',
  templateUrl: './community.page.html',
  styleUrls: ['./community.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CommunityPage implements OnInit {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  constructor() {
    addIcons({ closeOutline });
  }

  messages = signal<CommunityMessage[]>([]);
  messageInput = signal<string>('');
  selectedMoodKey = signal<string | null>(null);

  isPopupOpen = signal<boolean>(false);
  popupTitle = signal<string>('');
  popupDesc = signal<string>('');

  moods: MoodOption[] = [
    { key: "rosso", title: "Rosso", icon: "🔥", color: "#e74c3c" },
    { key: "giallo", title: "Giallo", icon: "☀️", color: "#f1c40f" },
    { key: "blu", title: "Blu", icon: "🌊", color: "#3498db" },
    { key: "verde", title: "Verde", icon: "🌿", color: "#2ecc71" },
    { key: "arancio", title: "Arancio", icon: "🍊", color: "#e67e22" },
    { key: "viola", title: "Viola", icon: "🔮", color: "#9b59b6" },
    { key: "bianco", title: "Bianco", icon: "☁️", color: "#ecf0f1" },
    { key: "nero", title: "Nero", icon: "🎱", color: "#2c3e50" },
    { key: "grigio", title: "Grigio", icon: "🌪️", color: "#95a5a6" }
  ];

  ngOnInit() {
    this.firebaseService.listenToCommunityMessages((data) => {
      if (data) {
        const msgs: CommunityMessage[] = Object.values(data);
        msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.messages.set(msgs);
      }
    });
  }

  selectMood(key: string) {
    this.selectedMoodKey.set(key);
  }

  sendMessage() {
    const msg = this.messageInput().trim();
    const moodKey = this.selectedMoodKey();

    if (!moodKey) {
      this.showStatus("Attenzione", "Seleziona un colore per il tuo messaggio!");
      return;
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
  }

  showStatus(title: string, message: string) {
    this.popupTitle.set(title);
    this.popupDesc.set(message);
    this.isPopupOpen.set(true);
  }

  closePopup() {
    this.isPopupOpen.set(false);
  }

  getMoodColor(key: string): string {
    return this.moods.find(m => m.key === key)?.color || '#ccc';
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
