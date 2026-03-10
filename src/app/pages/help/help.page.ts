import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { logoWhatsapp, call } from 'ionicons/icons';

interface Comment {
  text: string;
  likes: number;
}

interface Crisis {
  id: string;
  title: string;
  action: string;
  comments: Comment[];
  newComment?: string;
}

interface GeneratedCard {
  html: SafeHtml;
}

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HelpPage {

  selectedIssue: string = '';
  helpMode: 'wa' | 'self' = 'wa';

  trustPhone: string = '';
  sosText: string = 'Ho bisogno di aiuto, per favore contattami.';
  comfortResource: string = '';

  generatedCards: GeneratedCard[] = [];

  crisisData: Crisis[] = [
    {
      id: "suicide",
      title: "Pensieri Suicidi",
      action: "Non agire subito. Prometti a te stesso di aspettare 24 ore. La tua mente ti sta mentendo: il dolore può passare.",
      comments: [
        { text: "Chiama il Telefono Amico, mi hanno salvato la vita.", likes: 45 },
        { text: "Bagnati il viso con acqua gelata per resettare i sensi.", likes: 12 }
      ],
      newComment: ''
    },
    {
      id: "panic",
      title: "Attacco di Panico",
      action: "Tecnica 5-4-3-2-1: identifica 5 cose che vedi, 4 che puoi toccare. Respira profondamente.",
      comments: [
        { text: "Un attacco dura mediamente 10-20 minuti. Passerà.", likes: 21 }
      ],
      newComment: ''
    }
  ];

  constructor(private sanitizer: DomSanitizer) {
    addIcons({ logoWhatsapp, call });
  }

  ionViewWillEnter() {
    const savedPhone = localStorage.getItem('sos_phone');
    if (savedPhone) {
      this.trustPhone = savedPhone;
    }
  }

  callNumber(num: string) {
    window.location.href = `tel:${num}`;
  }

  addLike(crisis: Crisis, comment: Comment) {
    comment.likes++;
  }

  postComment(crisis: Crisis) {
    if (crisis.newComment && crisis.newComment.trim() !== '') {
      crisis.comments.push({ text: crisis.newComment.trim(), likes: 1 });
      crisis.newComment = '';
    }
  }

  executePlan() {
    localStorage.setItem('sos_phone', this.trustPhone);
    let issueText = "Te stesso";
    
    if (this.selectedIssue) {
      const issueMap: any = {
        'ansia': 'Ansia / Attacco di Panico',
        'suicidio': 'Pensieri Oscuri / Crisi Grave',
        'fisico': 'Dolore Fisico / Malessere',
        'rabbia': 'Rabbia Incontrollata'
      };
      issueText = issueMap[this.selectedIssue] || this.selectedIssue;
    }

    let rawHtml = '';

    if (this.helpMode === 'wa') {
      if (!this.trustPhone) {
        alert("Inserisci un numero di telefono!");
        return;
      }
      const text = encodeURIComponent(this.sosText);

      rawHtml = `
        <div class="crisis-card card-whatsapp">
            <h2 class="title-whatsapp">📱 Contatto di Fiducia Pronto</h2>
            <p>Ho preparato i canali di comunicazione per te.</p>
            <div class="message-preview">
                <small>Messaggio pronto:</small><br>
                "${this.sosText}"
            </div>
            <div class="contact-actions">
                <ion-button href="https://wa.me/${this.trustPhone}?text=${text}" target="_blank" expand="block" class="wa-btn" color="success">
                    <ion-icon name="logo-whatsapp" slot="start"></ion-icon> WhatsApp
                </ion-button>
                <ion-button href="tel:${this.trustPhone}" expand="block" class="tel-btn" color="light">
                    <ion-icon name="call" slot="start"></ion-icon> Telefono
                </ion-button>
            </div>
        </div>
      `;
    } else {
      const resource = this.comfortResource || "Respira profondamente. Tutto passerà.";
      rawHtml = `
        <div class="crisis-card card-self">
            <h2 class="title-self">✨ Kit di Auto-Aiuto</h2>
            <p><strong>Per:</strong> ${issueText}</p>
            <div class="resource-box">
                ${resource}
            </div>
        </div>
      `;
    }

    this.generatedCards.unshift({
      html: this.sanitizer.bypassSecurityTrustHtml(rawHtml)
    });
  }

}
