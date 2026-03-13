import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
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

  // In help.page.ts — sostituisce generatedCards
  generatedPlan = signal<{mode: 'wa' | 'self', phone: string, sosText: string, resource: string, issueText: string} | null>(null);


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

  encodeURI(text: string): string {
    return encodeURIComponent(text);
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

    if (this.helpMode === 'wa' && !this.trustPhone) {
      alert("Inserisci un numero di telefono!");
      return;
    }

    this.generatedPlan.set({ mode: this.helpMode, phone: this.trustPhone, sosText: this.sosText, resource: this.comfortResource || "Respira profondamente. Tutto passerà.", issueText });
  }

}
