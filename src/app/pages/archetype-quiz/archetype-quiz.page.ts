import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, LoadingController } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { Auth } from '@firebase/auth';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, homeOutline, refreshOutline, starOutline } from 'ionicons/icons';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  imports: [IonicModule, CommonModule, FormsModule, TranslatePipe]
})
export class ArchetypeQuizPage implements OnInit, OnDestroy {
  currentQuestionIndex = signal(0);
  selectedAnswers = signal<{ [questionId: string]: string[] }>({});
  quizCompleted = signal(false);
  archetypeProfile = signal<ArchetypeProfile | null>(null);
  loading = signal(false);

  // Quiz questions based on Jungian archetypes
  private QUESTIONS_IT: QuizQuestion[] = [
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

  private QUESTIONS_EN: QuizQuestion[] = [
    {
      id: '1',
      text: 'In a crisis situation, you usually:',
      options: [
        { id: '1a', text: 'Take control and lead others', archetypes: ['sovrano', 'eroe'], weight: 3 },
        { id: '1b', text: 'Look for creative, unconventional solutions', archetypes: ['creatore', 'esploratore'], weight: 3 },
        { id: '1c', text: 'Analyze the situation calmly and wisely', archetypes: ['saggio'], weight: 3 },
        { id: '1d', text: 'Question the established rules', archetypes: ['ribelle'], weight: 3 }
      ],
      type: 'single',
      category: 'leadership'
    },
    {
      id: '2',
      text: 'My ideal in life is:',
      options: [
        { id: '2a', text: 'To create something unique and meaningful', archetypes: ['creatore'], weight: 3 },
        { id: '2b', text: 'To explore new territories and possibilities', archetypes: ['esploratore'], weight: 3 },
        { id: '2c', text: "To improve other people's lives", archetypes: ['eroe', 'sovrano'], weight: 3 },
        { id: '2d', text: 'To understand the deep mysteries of life', archetypes: ['saggio'], weight: 3 }
      ],
      type: 'single',
      category: 'purpose'
    },
    {
      id: '3',
      text: 'Faced with an injustice:',
      options: [
        { id: '3a', text: 'I actively fight to change things', archetypes: ['ribelle', 'eroe'], weight: 3 },
        { id: '3b', text: 'I create a fairer alternative system', archetypes: ['creatore', 'sovrano'], weight: 3 },
        { id: '3c', text: 'I try to understand the deeper causes', archetypes: ['saggio'], weight: 3 },
        { id: '3d', text: 'I explore ways out or new solutions', archetypes: ['esploratore'], weight: 3 }
      ],
      type: 'single',
      category: 'justice'
    },
    {
      id: '4',
      text: 'In relationships, I feel most at ease when:',
      options: [
        { id: '4a', text: 'I can offer guidance and wisdom', archetypes: ['saggio', 'sovrano'], weight: 3 },
        { id: '4b', text: 'We can explore new experiences together', archetypes: ['esploratore'], weight: 3 },
        { id: '4c', text: 'We can create something beautiful together', archetypes: ['creatore'], weight: 3 },
        { id: '4d', text: 'I can inspire and motivate the other person', archetypes: ['eroe'], weight: 3 }
      ],
      type: 'single',
      category: 'relationships'
    },
    {
      id: '5',
      text: 'My greatest fear is:',
      options: [
        { id: '5a', text: 'Mediocrity and normality', archetypes: ['creatore', 'esploratore'], weight: 3 },
        { id: '5b', text: 'Losing control or power', archetypes: ['sovrano'], weight: 3 },
        { id: '5c', text: 'Not being able to help those in need', archetypes: ['eroe'], weight: 3 },
        { id: '5d', text: 'Ignorance and superficiality', archetypes: ['saggio'], weight: 3 },
        { id: '5e', text: 'Being controlled or manipulated', archetypes: ['ribelle'], weight: 3 }
      ],
      type: 'single',
      category: 'fears'
    }
  ];

  private get questions(): QuizQuestion[] {
    return this.i18n.lang() === 'en' ? this.QUESTIONS_EN : this.QUESTIONS_IT;
  }

  private archetypes = ['sovrano', 'eroe', 'esploratore', 'creatore', 'saggio', 'ribelle'];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private firebaseService: FirebaseService,
    public i18n: I18nService
  ) {
    addIcons({ chevronBackOutline, chevronForwardOutline, homeOutline, refreshOutline, starOutline });
  }

  getArchetypeName(key: string): string {
    return this.i18n.t('archetipi.arch.' + key);
  }

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
      await this.showWarning(this.i18n.t('archetypeQuiz.selectAnswerToContinue'));
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
      message: this.i18n.t('archetypeQuiz.calculatingProfile')
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
      this.showError(this.i18n.t('archetypeQuiz.profileCalcError'));
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
      sovrano: this.i18n.t('archetypeQuiz.desc.sovrano'),
      eroe: this.i18n.t('archetypeQuiz.desc.eroe'),
      esploratore: this.i18n.t('archetypeQuiz.desc.esploratore'),
      creatore: this.i18n.t('archetypeQuiz.desc.creatore'),
      saggio: this.i18n.t('archetypeQuiz.desc.saggio'),
      ribelle: this.i18n.t('archetypeQuiz.desc.ribelle')
    };

    const alert = await this.alertCtrl.create({
      header: this.i18n.t('archetypeQuiz.resultsHeader'),
      message: `
        <div style="text-align: left;">
          <h4><strong>${this.i18n.t('archetypeQuiz.primaryLabel')}</strong> ${this.getArchetypeName(profile.primary).toUpperCase()}</h4>
          <p>${archetypeDescriptions[profile.primary] || ''}</p>
          
          <h4><strong>${this.i18n.t('archetypeQuiz.secondaryLabel')}</strong></h4>
          <ul>
            ${profile.secondary.map(arch => `<li>${this.getArchetypeName(arch)}: ${archetypeDescriptions[arch] || ''}</li>`).join('')}
          </ul>
          
          <p style="margin-top: 16px; font-style: italic;">
            ${this.i18n.t('archetypeQuiz.personalizeNote')}
          </p>
        </div>
      `,
      buttons: [
        {
          text: this.i18n.t('archetypeQuiz.retakeTest'),
          role: 'cancel',
          handler: () => {
            this.resetQuiz();
          }
        },
        {
          text: this.i18n.t('archetypeQuiz.continueBtn'),
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
      header: this.i18n.t('archetypeQuiz.retakeHeader'),
      message: this.i18n.t('archetypeQuiz.retakeConfirm'),
      buttons: [
        {
          text: this.i18n.t('archetypeQuiz.cancel'),
          role: 'cancel'
        },
        {
          text: this.i18n.t('archetypeQuiz.retake'),
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
      header: this.i18n.t('archetypeQuiz.errorTitle'),
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showWarning(message: string) {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('archetypeQuiz.attentionTitle'),
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
