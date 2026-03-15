import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { StorageService } from '../../services/storage/storage';

interface RoadmapFeature {
  id: string;
  title: string;
  descAdd: string;
  descWhyLabel: string;
  descWhy: string;
}

interface PitchItem {
  title: string;
  desc: string;
}

@Component({
  selector: 'app-roadmap',
  templateUrl: './roadmap.page.html',
  styleUrls: ['./roadmap.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RoadmapPage implements OnInit, OnDestroy {
  // ... existing fields ...
  private unsubscribeVotes: (() => void) | null = null;

  features: RoadmapFeature[] = [
    {
      id: 'tracker',
      title: '1. Diario Emozionale (Mood Tracker)',
      descAdd: 'Una sezione "Cronologia" dove all\'utente vengono salvate le selezioni fatte sulla ruota.',
      descWhyLabel: 'Perché',
      descWhy: 'Permette all\'utente e al terapeuta di vedere pattern ricorrenti (es. "Sei stato spesso sul blu questa settimana").'
    },
    {
      id: 'grounding',
      title: '2. Grounding Exercises (Radicamento)',
      descAdd: 'Una funzione SOS che guida l\'utente nella tecnica del 5-4-3-2-1 (identificare 5 cose che vedi, 4 che senti, ecc.).',
      descWhyLabel: 'Implementazione',
      descWhy: 'Una sequenza di slide interattive.'
    },
    {
      id: 'panic',
      title: '3. Panic Button (Privacy)',
      descAdd: 'Un tasto rapido (icona "Esc") che nasconde i contenuti o reindirizza a una pagina neutra (Google/Meteo).',
      descWhyLabel: 'Perché',
      descWhy: 'Aumenta il senso di sicurezza per chi teme il giudizio degli altri mentre usa l\'app.'
    },
    {
      id: 'resources',
      title: '4. Risorse e Geocalizzazione',
      descAdd: 'Link diretti ai numeri verdi nazionali e una mappa dei centri di igiene mentale più vicini.',
      descWhyLabel: 'Perché',
      descWhy: 'Dimostra che l\'app è un ponte verso il mondo reale delle cure professionali.'
    },
    {
      id: 'pantheon',
      title: '5. Raffinatezza (Il Pantheon)',
      descAdd: 'Un mini-questionario di 5 domande per assegnare i punti agli archetipi in automatico.',
      descWhyLabel: 'Audio-Meditazioni',
      descWhy: 'Player audio per rumore bianco o guide vocali diverse per ogni archetipo dominante.'
    }
  ];

  pitchItems: PitchItem[] = [
    { title: '1. Privacy by Design', desc: 'I dati sono salvati in un file locale che si autodistrugge a fine sessione. Non tracciamo l\'utente, proteggiamo il suo spazio sacro.' },
    { title: '2. Accessibilità Cognitiva', desc: 'L\'interfaccia avrà una Dark Mode migliorata e l\'uso dei colori riducono il carico cognitivo e lo stress visivo.' },
    { title: '3. Empowerment, non Diagnosi', desc: 'L\'app non sostituisce il medico, ma aiuta l\'utente a dare un nome a ciò che prova (alfabetizzazione emotiva).' },
    { title: '4. Esercizi Interattivi', desc: 'Aiuto nel lungo termine ed aiuto nel qui ed ora.' }
  ];

  votes = signal<{ [key: string]: number }>({});

  constructor(
    private firebaseService: FirebaseService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    this.unsubscribeVotes = this.firebaseService.listenToVotes((votesData: any) => {
      if (votesData) {
        this.votes.set(votesData);
      }
    });
  }

  ngOnDestroy() {
    if (this.unsubscribeVotes) {
      this.unsubscribeVotes();
    }
  }

  hasVoted(featureId: string): boolean {
    return this.storageService.hasVoted(featureId);
  }

  vote(featureId: string) {
    if (this.hasVoted(featureId)) return;
    
    const userName = this.storageService.getUserName();
    this.firebaseService.voteInFirebase(featureId, userName);
    this.storageService.setVoted(featureId);
    
    // Optimistic update
    this.votes.update((v: { [key: string]: number }) => {
      const next = { ...v };
      next[featureId] = (next[featureId] || 0) + 1;
      return next;
    });
  }
}
