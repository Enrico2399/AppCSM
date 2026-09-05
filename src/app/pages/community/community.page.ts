import { MoodService, Mood } from '../../services/mood/mood.service';
import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';
import { take } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, send } from 'ionicons/icons';
import { PopupService } from '../../services/popup/popup.service';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  imports: [IonicModule, CommonModule, FormsModule, TranslatePipe]
})
export class CommunityPage implements OnInit, OnDestroy {
  public i18n = inject(I18nService);
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  public popupService = inject(PopupService);

  constructor() {
    addIcons({ closeOutline, send });

    // Riallinea la lista mood (icone/colori) quando cambia la lingua
    effect(() => {
      this.moods.set(this.moodService.getMoods());
    });
  }

  messages = signal<CommunityMessage[]>([]);
  messageInput = signal<string>('');
  selectedMoodKey = signal<string | null>(null);

  private moodService = inject(MoodService);
  moods = signal<Mood[]>(this.moodService.getMoods());

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
      this.popupService.showStatus(this.i18n.t('community.attentionTitle'), this.i18n.t('community.selectColor'));
      return;
    }
    if (!msg) {
      this.popupService.showStatus(this.i18n.t('community.attentionTitle'), this.i18n.t('community.writeMessage'));
      return;
    }

    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.firebaseService.sendCommunityMessage(
          user.uid,
          user.displayName || this.i18n.t('community.defaultUserName'),
          moodKey,
          msg
        );
        this.messageInput.set('');
        this.selectedMoodKey.set(null);
        this.popupService.showStatus(this.i18n.t('community.sentTitle'), this.i18n.t('community.sentMsg'));
      } else {
        this.popupService.showStatus(this.i18n.t('community.errorTitle'), this.i18n.t('community.mustBeLoggedIn'));
      }
    });

    // Rimuovo la chiamata duplicata
    // this.popupService.showStatus("Inviato", "Il tuo messaggio è stato pubblicato...");
  }

  closePopup() {
    this.popupService.close();
  }

  getMoodColor(key: string): string {
    return this.moodService.getMoodColor(key);
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString(this.i18n.lang() === 'en' ? 'en-US' : 'it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }
}
