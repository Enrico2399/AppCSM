import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../services/firebase/firebase';
import { StorageService } from '../../services/storage/storage';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface RoadmapFeature {
  id: string;
  title: string;
  descAdd: string;
  descWhyLabel: string;
  descWhy: string;
  // Stato reale della funzione (verificato leggendo il codice, non solo la
  // descrizione qui sotto, che e' rimasta quella originale della proposta):
  // 'done' = gia' disponibile e usabile oggi; 'partial' = in parte disponibile;
  // undefined = non ancora iniziata. statusNote spiega cosa manca per 'partial'.
  status?: 'done' | 'partial';
  statusNote?: string;
  route?: string;
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
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, TranslatePipe]
})
export class RoadmapPage implements OnInit, OnDestroy {
  // ... existing fields ...
  public i18n = inject(I18nService);
  private unsubscribeVotes: (() => void) | null = null;

  private readonly FEATURES_IT: RoadmapFeature[] = [
    {
      id: 'tracker',
      title: '1. Diario Emozionale (Mood Tracker)',
      descAdd: 'Una sezione "Cronologia" dove all\'utente vengono salvate le selezioni fatte sulla ruota.',
      descWhyLabel: 'Perché',
      descWhy: 'Permette all\'utente e al terapeuta di vedere pattern ricorrenti (es. "Sei stato spesso sul blu questa settimana").',
      status: 'done',
      route: '/history'
    },
    {
      id: 'grounding',
      title: '2. Grounding Exercises (Radicamento)',
      descAdd: 'Una funzione SOS che guida l\'utente nella tecnica del 5-4-3-2-1 (identificare 5 cose che vedi, 4 che senti, ecc.).',
      descWhyLabel: 'Implementazione',
      descWhy: 'Una sequenza di slide interattive.',
      status: 'done',
      route: '/grounding'
    },
    {
      id: 'panic',
      title: '3. Panic Button (Privacy)',
      descAdd: 'Un tasto rapido (icona "Esc") che nasconde i contenuti o reindirizza a una pagina neutra (Google/Meteo).',
      descWhyLabel: 'Perché',
      descWhy: 'Aumenta il senso di sicurezza per chi teme il giudizio degli altri mentre usa l\'app.',
      status: 'done',
      statusNote: 'Il pulsante è già attivo: lo trovi in basso a destra in ogni pagina dell\'app.'
    },
    {
      id: 'resources',
      title: '4. Risorse e Geocalizzazione',
      descAdd: 'Link diretti ai numeri verdi nazionali e una mappa dei centri di igiene mentale più vicini.',
      descWhyLabel: 'Perché',
      descWhy: 'Dimostra che l\'app è un ponte verso il mondo reale delle cure professionali.',
      status: 'done',
      route: '/resources'
    },
    {
      id: 'pantheon',
      title: '5. Raffinatezza (Il Pantheon)',
      descAdd: 'Un mini-questionario di 5 domande per assegnare i punti agli archetipi in automatico.',
      descWhyLabel: 'Audio-Meditazioni',
      descWhy: 'Player audio per rumore bianco o guide vocali diverse per ogni archetipo dominante.',
      status: 'partial',
      statusNote: 'Il quiz è già disponibile e funzionante. Il player audio è costruito ma senza registrazioni vere: servono meditazioni audio professionali prima di attivarlo per gli utenti.',
      route: '/archetype-quiz'
    }
  ];

  private readonly FEATURES_EN: RoadmapFeature[] = [
    {
      id: 'tracker',
      title: '1. Emotional Diary (Mood Tracker)',
      descAdd: 'A "History" section where the user\'s selections from the wheel are saved.',
      descWhyLabel: 'Why',
      descWhy: 'Lets the user and the therapist spot recurring patterns (e.g. "You\'ve often been on blue this week").',
      status: 'done',
      route: '/history'
    },
    {
      id: 'grounding',
      title: '2. Grounding Exercises',
      descAdd: 'An SOS feature that guides the user through the 5-4-3-2-1 technique (identify 5 things you see, 4 you feel, etc.).',
      descWhyLabel: 'Implementation',
      descWhy: 'An interactive slide sequence.',
      status: 'done',
      route: '/grounding'
    },
    {
      id: 'panic',
      title: '3. Panic Button (Privacy)',
      descAdd: 'A quick button ("Esc" icon) that hides the content or redirects to a neutral page (Google/Weather).',
      descWhyLabel: 'Why',
      descWhy: 'Increases the sense of safety for those who fear others\' judgment while using the app.',
      status: 'done',
      statusNote: 'The button is already active: you\'ll find it in the bottom right of every page in the app.'
    },
    {
      id: 'resources',
      title: '4. Resources and Geolocation',
      descAdd: 'Direct links to national helplines and a map of the nearest mental health centers.',
      descWhyLabel: 'Why',
      descWhy: 'Shows that the app is a bridge to the real world of professional care.',
      status: 'done',
      route: '/resources'
    },
    {
      id: 'pantheon',
      title: '5. Refinement (The Pantheon)',
      descAdd: 'A 5-question mini-quiz that automatically assigns points to the archetypes.',
      descWhyLabel: 'Audio Meditations',
      descWhy: 'Audio player for white noise or different voice guides for each dominant archetype.',
      status: 'partial',
      statusNote: 'The quiz is already available and working. The audio player is built but without real recordings: professional audio meditations are needed before activating it for users.',
      route: '/archetype-quiz'
    }
  ];

  private readonly PITCH_ITEMS_IT: PitchItem[] = [
    { title: '1. Privacy by Design', desc: 'I dati sono salvati in un file locale che si autodistrugge a fine sessione. Non tracciamo l\'utente, proteggiamo il suo spazio sacro.' },
    { title: '2. Accessibilità Cognitiva', desc: 'L\'interfaccia avrà una Dark Mode migliorata e l\'uso dei colori riducono il carico cognitivo e lo stress visivo.' },
    { title: '3. Empowerment, non Diagnosi', desc: 'L\'app non sostituisce il medico, ma aiuta l\'utente a dare un nome a ciò che prova (alfabetizzazione emotiva).' },
    { title: '4. Esercizi Interattivi', desc: 'Aiuto nel lungo termine ed aiuto nel qui ed ora.' }
  ];

  private readonly PITCH_ITEMS_EN: PitchItem[] = [
    { title: '1. Privacy by Design', desc: 'Data is saved in a local file that self-destructs at the end of the session. We don\'t track the user, we protect their sacred space.' },
    { title: '2. Cognitive Accessibility', desc: 'The interface will have an improved Dark Mode, and the use of color reduces cognitive load and visual stress.' },
    { title: '3. Empowerment, Not Diagnosis', desc: 'The app doesn\'t replace a doctor, but helps the user put a name to what they feel (emotional literacy).' },
    { title: '4. Interactive Exercises', desc: 'Help for the long term and help for the here and now.' }
  ];

  features = computed(() => this.i18n.lang() === 'en' ? this.FEATURES_EN : this.FEATURES_IT);
  pitchItems = computed(() => this.i18n.lang() === 'en' ? this.PITCH_ITEMS_EN : this.PITCH_ITEMS_IT);

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
