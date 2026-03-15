import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, LoadingController } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { Auth } from '@firebase/auth';

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  type: 'single' | 'multiple' | 'scale';
  category: string;
}

export interface QuizOption {
  id: string;
  text: string;
  archetypes: string[];
  weight: number;
}

export interface ArchetypeProfile {
  primary: string;
  secondary: string[];
  scores: { [archetype: string]: number };
  completedAt: string;
  userId: string;
}

@Component({
  selector: 'app-archetype-quiz',
  templateUrl: './archetype-quiz.page.html',
  styleUrls: ['./archetype-quiz.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ArchetypeQuizPage implements OnInit, OnDestroy {
  currentQuestionIndex = signal(0);
  selectedAnswers = signal<{ [questionId: string]: string[] }>({});
  quizCompleted = signal(false);
  archetypeProfile = signal<ArchetypeProfile | null>(null);
  loading = signal(false);

  // Quiz questions based on Jungian archetypes
  private questions: QuizQuestion[] = [
    {
      id: '1',
      text: 'In una situazione di crisi, di solito:',
      options: [
        { id: '1a', text: 'Prendo il controllo e guido gli altri', archetypes: ['sovrano', 'eroe'], weight: 3 },
        { id: '1b', text: 'Cerco soluzioni creative e non convenzionali', archetypes: ['creatore', 'esploratore'], weight: 3 },
        { id: '1c', text: 'Analizzo la situazione con calma e saggezza', archetypes: ['saggio'], weight: 3 },
        { id: '1d', text: 'Metto in discussione le regole stabilite', archetypes: ['ribelle'], weight: 3 }
      ],
      type: 'single',
      category: 'leadership'
    },
    {
      id: '2',
      text: 'Il mio ideale di vita è:',
      options: [
        { id: '2a', text: 'Creare qualcosa di unico e significativo', archetypes: ['creatore'], weight: 3 },
        { id: '2b', text: 'Esplorare nuovi territori e possibilità', archetypes: ['esploratore'], weight: 3 },
        { id: '2c', text: 'Migliorare la vita degli altri', archetypes: ['eroe', 'sovrano'], weight: 3 },
        { id: '2d', text: 'Capire i profondi misteri della vita', archetypes: ['saggio'], weight: 3 }
      ],
      type: 'single',
      category: 'purpose'
    },
    {
      id: '3',
      text: 'Di fronte a un\'ingiustizia:',
      options: [
        { id: '3a', text: 'Lotto attivamente per cambiare le cose', archetypes: ['ribelle', 'eroe'], weight: 3 },
        { id: '3b', text: 'Creo un sistema alternativo più equo', archetypes: ['creatore', 'sovrano'], weight: 3 },
        { id: '3c', text: 'Cerco di comprendere le cause profonde', archetypes: ['saggio'], weight: 3 },
        { id: '3d', text: 'Esploro vie di fuga o nuove soluzioni', archetypes: ['esploratore'], weight: 3 }
      ],
      type: 'single',
      category: 'justice'
    },
    {
      id: '4',
      text: 'Nelle relazioni, mi sento più a mio agio quando:',
      options: [
        { id: '4a', text: 'Posso offrire guida e saggezza', archetypes: ['saggio', 'sovrano'], weight: 3 },
        { id: '4b', text: 'Possiamo esplorare insieme nuove esperienze', archetypes: ['esploratore'], weight: 3 },
        { id: '4c', text: 'Possiamo creare qualcosa di bello insieme', archetypes: ['creatore'], weight: 3 },
        { id: '4d', text: 'Posso ispirare e motivare l\'altro', archetypes: ['eroe'], weight: 3 }
      ],
      type: 'single',
      category: 'relationships'
    },
    {
      id: '5',
      text: 'La mia più grande paura è:',
      options: [
        { id: '5a', text: 'La mediocrità e la normalità', archetypes: ['creatore', 'esploratore'], weight: 3 },
        { id: '5b', text: 'Perdere il controllo o il potere', archetypes: ['sovrano'], weight: 3 },
        { id: '5c', text: 'Non poter aiutare chi ha bisogno', archetypes: ['eroe'], weight: 3 },
        { id: '5d', text: 'L\'ignoranza e la superficialità', archetypes: ['saggio'], weight: 3 },
        { id: '5e', text: 'Essere controllato o manipolato', archetypes: ['ribelle'], weight: 3 }
      ],
      type: 'single',
      category: 'fears'
    }
  ];

  private archetypes = ['sovrano', 'eroe', 'esploratore', 'creatore', 'saggio', 'ribelle'];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.loadExistingProfile();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private async loadExistingProfile() {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) return;

    try {
      const profile = await this.firebaseService.getArchetypeProfile(currentUser.uid);
      if (profile) {
        this.archetypeProfile.set(profile);
        this.quizCompleted.set(true);
      }
    } catch (error) {
      console.error('Error loading archetype profile:', error);
    }
  }

  getCurrentQuestion(): QuizQuestion {
    return this.questions[this.currentQuestionIndex()];
  }

  getCurrentQuestionIndex(): number {
    return this.currentQuestionIndex();
  }

  getAllQuestions(): QuizQuestion[] {
    return this.questions;
  }

  getProgressPercentage(): number {
    return ((this.currentQuestionIndex() + 1) / this.questions.length) * 100;
  }

  isQuestionAnswered(questionId: string): boolean {
    const answers = this.selectedAnswers();
    return answers[questionId] && answers[questionId].length > 0;
  }

  onAnswerChange(questionId: string, optionId: string) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;

    const answers = { ...this.selectedAnswers() };
    
    if (question.type === 'single') {
      answers[questionId] = [optionId];
    } else {
      // For multiple choice questions
      if (!answers[questionId]) {
        answers[questionId] = [];
      }
      const index = answers[questionId].indexOf(optionId);
      if (index > -1) {
        answers[questionId].splice(index, 1);
      } else {
        answers[questionId].push(optionId);
      }
    }
    
    this.selectedAnswers.set(answers);
  }

  isOptionSelected(questionId: string, optionId: string): boolean {
    const answers = this.selectedAnswers();
    return answers[questionId]?.includes(optionId) || false;
  }

  canGoNext(): boolean {
    const currentQuestion = this.getCurrentQuestion();
    return this.isQuestionAnswered(currentQuestion.id);
  }

  async nextQuestion() {
    if (!this.canGoNext()) {
      await this.showWarning('Seleziona una risposta per continuare');
      return;
    }

    if (this.currentQuestionIndex() < this.questions.length - 1) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
    } else {
      await this.completeQuiz();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
    }
  }

  private async completeQuiz() {
    const loading = await this.loadingCtrl.create({
      message: 'Calcolo del tuo profilo...'
    });
    await loading.present();

    try {
      const profile = this.calculateArchetypeProfile();
      this.archetypeProfile.set(profile);
      this.quizCompleted.set(true);

      // Save to Firebase
      const currentUser = this.firebaseService.auth.currentUser;
      if (currentUser) {
        await this.firebaseService.saveArchetypeProfile(currentUser.uid, profile);
      }

      await loading.dismiss();
      await this.showResults(profile);
    } catch (error) {
      await loading.dismiss();
      console.error('Error completing quiz:', error);
      this.showError('Errore nel calcolo del profilo');
    }
  }

  private calculateArchetypeProfile(): ArchetypeProfile {
    const scores: { [archetype: string]: number } = {};
    
    // Initialize scores
    this.archetypes.forEach(archetype => {
      scores[archetype] = 0;
    });

    // Calculate scores based on answers
    Object.entries(this.selectedAnswers()).forEach(([questionId, selectedOptions]) => {
      const question = this.questions.find(q => q.id === questionId);
      if (!question) return;

      selectedOptions.forEach(optionId => {
        const option = question.options.find(opt => opt.id === optionId);
        if (option) {
          option.archetypes.forEach(archetype => {
            scores[archetype] = (scores[archetype] || 0) + option.weight;
          });
        }
      });
    });

    // Find primary and secondary archetypes
    const sortedArchetypes = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .map(([archetype]) => archetype);

    const currentUser = this.firebaseService.auth.currentUser;

    return {
      primary: sortedArchetypes[0],
      secondary: sortedArchetypes.slice(1, 3),
      scores,
      completedAt: new Date().toISOString(),
      userId: currentUser?.uid || 'anonymous'
    };
  }

  private async showResults(profile: ArchetypeProfile) {
    const archetypeDescriptions: { [key: string]: string } = {
      sovrano: 'Il leader naturale, colui che porta ordine e stabilità',
      eroe: 'Il coraggioso che lotta per giustizia e protegge gli altri',
      esploratore: 'L\'avventuriero che cerca nuove esperienze e conoscenze',
      creatore: 'L\'artista che dà forma alle idee e crea bellezza',
      saggio: 'Il saggio che comprende i misteri e guida con saggezza',
      ribelle: 'Il rivoluzionario che sfida lo status quo e cerca il cambiamento'
    };

    const alert = await this.alertCtrl.create({
      header: 'Il Tuo Profilo Archetipico',
      message: `
        <div style="text-align: left;">
          <h4><strong>Archetipo Primario:</strong> ${profile.primary.toUpperCase()}</h4>
          <p>${archetypeDescriptions[profile.primary] || ''}</p>
          
          <h4><strong>Archetipi Secondari:</strong></h4>
          <ul>
            ${profile.secondary.map(arch => `<li>${arch}: ${archetypeDescriptions[arch] || ''}</li>`).join('')}
          </ul>
          
          <p style="margin-top: 16px; font-style: italic;">
            Questo profilo ti aiuterà a personalizzare la tua esperienza nell\'app.
          </p>
        </div>
      `,
      buttons: [
        {
          text: 'Rifai il Test',
          role: 'cancel',
          handler: () => {
            this.resetQuiz();
          }
        },
        {
          text: 'Continua',
          handler: () => {
            this.navCtrl.navigateForward('/archetipi');
          }
        }
      ]
    });

    await alert.present();
  }

  async resetQuiz() {
    const alert = await this.alertCtrl.create({
      header: 'Rifare il Test',
      message: 'Sei sicuro di voler rifare il test? I risultati precedenti andranno persi.',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Rifai',
          handler: () => {
            this.currentQuestionIndex.set(0);
            this.selectedAnswers.set({});
            this.quizCompleted.set(false);
            this.archetypeProfile.set(null);
          }
        }
      ]
    });

    await alert.present();
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Errore',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showWarning(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Attenzione',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
