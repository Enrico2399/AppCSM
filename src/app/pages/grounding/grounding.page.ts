import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Auth } from '@firebase/auth';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, checkmarkCircleOutline, homeOutline, leafOutline, refreshOutline } from 'ionicons/icons';

export interface GroundingStep {
  type: 'see' | 'touch' | 'hear' | 'smell' | 'taste';
  prompt: string;
  userInput: string[];
  completed: boolean;
}

export interface GroundingSession {
  id: string;
  userId: string;
  type: '5-4-3-2-1';
  steps: GroundingStep[];
  currentStep: number;
  completed: boolean;
  startTime: string;
  endTime?: string;
  duration?: number;
}

@Component({
  selector: 'app-grounding',
  templateUrl: './grounding.page.html',
  styleUrls: ['./grounding.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TranslatePipe]
})
export class GroundingPage implements OnInit, OnDestroy {
  session = signal<GroundingSession | null>(null);
  currentStep = signal(0);
  isCompleted = signal(false);
  userInput = signal<string[]>([]);
  userInputText = signal('');

  // Step definitions
  private steps: GroundingStep[] = [
    {
      type: 'see',
      prompt: 'Cerca intorno a te e nomina 5 cose che puoi vedere:',
      userInput: [],
      completed: false
    },
    {
      type: 'touch',
      prompt: 'Concentrati e nomina 4 cose che puoi toccare:',
      userInput: [],
      completed: false
    },
    {
      type: 'hear',
      prompt: 'Ascolta attentamente e nomina 3 cose che puoi sentire:',
      userInput: [],
      completed: false
    },
    {
      type: 'smell',
      prompt: 'Presta attenzione e nomina 2 cose che puoi odorare:',
      userInput: [],
      completed: false
    },
    {
      type: 'taste',
      prompt: 'Infine, nomina 1 cosa che puoi gustare:',
      userInput: [],
      completed: false
    }
  ];

  public i18n = inject(I18nService);

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private firebaseService: FirebaseService
  ) {
    addIcons({ arrowForwardOutline, checkmarkCircleOutline, homeOutline, leafOutline, refreshOutline });
  }

  ngOnInit() {
    this.initializeSession();
  }

  ngOnDestroy() {
    // Save session if incomplete
    if (this.session() && !this.isCompleted()) {
      this.saveSession(false);
    }
  }

  private generateSessionId(): string {
    return `grounding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentStep(): GroundingStep {
    const session = this.session();
    if (!session) return this.steps[0];
    return session.steps[this.currentStep()];
  }

  // I prompt vivono nell'array 'steps' in italiano (copiati anche dentro
  // ogni sessione salvata su Firebase, per mantenere lo storico coerente con
  // la lingua di quando e' stato fatto l'esercizio): per la lingua mostrata
  // ORA nel template si usa invece questa traduzione in base al tipo di
  // passaggio, che si aggiorna subito se l'utente cambia lingua a metà
  // esercizio.
  getCurrentStepPrompt(): string {
    return this.i18n.t('grounding.prompt.' + this.getCurrentStep().type);
  }

  getExpectedCount(): number {
    const step = this.getCurrentStep();
    const counts = { see: 5, touch: 4, hear: 3, smell: 2, taste: 1 };
    return counts[step.type];
  }

  getStepIcon(): string {
    const step = this.getCurrentStep();
    const icons = {
      see: 'eye-outline',
      touch: 'hand-left-outline',
      hear: 'volume-high-outline',
      smell: 'leaf-outline',
      taste: 'restaurant-outline'
    };
    return icons[step.type];
  }

  getStepColor(): string {
    const step = this.getCurrentStep();
    const colors = {
      see: 'primary',
      touch: 'secondary',
      hear: 'tertiary',
      smell: 'success',
      taste: 'warning'
    };
    return colors[step.type];
  }

  onInputChange(event: any) {
    const input = event.target.value;
    this.userInputText.set(input);
    const items = input.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
    this.userInput.set(items);
  }

  async nextStep() {
    const currentItems = this.userInput();
    const expectedCount = this.getExpectedCount();

    if (currentItems.length < expectedCount) {
      await this.showWarning(this.i18n.t('grounding.minItemsWarning', { count: expectedCount }));
      return;
    }

    // Update current step with user input
    const session = this.session();
    if (session) {
      session.steps[this.currentStep()].userInput = currentItems;
      session.steps[this.currentStep()].completed = true;
      session.currentStep = this.currentStep() + 1;

      if (this.currentStep() < this.steps.length - 1) {
        // Move to next step
        this.currentStep.set(this.currentStep() + 1);
        this.userInput.set([]);
        this.userInputText.set('');
      } else {
        // Complete session
        await this.completeSession();
      }
    }
  }

  private async completeSession() {
    const session = this.session();
    if (!session) return;

    session.completed = true;
    session.endTime = new Date().toISOString();
    session.duration = this.calculateDuration(session.startTime, session.endTime);

    this.isCompleted.set(true);
    await this.saveSession(true);
    await this.showCompletionMessage();
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / 1000); // seconds
  }

  private async saveSession(completed: boolean) {
    const session = this.session();
    if (!session) return;

    try {
      await this.firebaseService.saveGroundingSession(session);
    } catch (error) {
      console.error('Error saving grounding session:', error);
    }
  }

  private async showCompletionMessage() {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('grounding.completedTitle'),
      message: this.i18n.t('grounding.completedMessage'),
      buttons: [
        {
          text: this.i18n.t('grounding.newExercise'),
          handler: () => {
            this.initializeSession();
          }
        },
        {
          text: this.i18n.t('grounding.backToHome'),
          handler: () => {
            this.navCtrl.navigateRoot('/home');
          }
        }
      ]
    });

    await alert.present();
  }

  initializeSession() {
    this.userInputText.set('');
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) {
      this.showError(this.i18n.t('grounding.notAuthenticated'));
      return;
    }

    const newSession: GroundingSession = {
      id: this.generateSessionId(),
      userId: currentUser.uid,
      type: '5-4-3-2-1',
      steps: [...this.steps],
      currentStep: 0,
      completed: false,
      startTime: new Date().toISOString()
    };

    this.session.set(newSession);
    this.currentStep.set(0);
    this.userInput.set([]);
    this.isCompleted.set(false);
  }

  async restartSession() {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('grounding.restartTitle'),
      message: this.i18n.t('grounding.restartConfirm'),
      buttons: [
        {
          text: this.i18n.t('grounding.cancel'),
          role: 'cancel'
        },
        {
          text: this.i18n.t('grounding.restart'),
          handler: () => {
            this.initializeSession();
          }
        }
      ]
    });

    await alert.present();
  }

  async skipStep() {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('grounding.skipTitle'),
      message: this.i18n.t('grounding.skipConfirm'),
      buttons: [
        {
          text: this.i18n.t('grounding.cancel'),
          role: 'cancel'
        },
        {
          text: this.i18n.t('grounding.skip'),
          handler: () => {
            const session = this.session();
            if (session && this.currentStep() < this.steps.length - 1) {
              session.steps[this.currentStep()].completed = true;
              this.currentStep.set(this.currentStep() + 1);
              this.userInput.set([]);
              this.userInputText.set('');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getProgressPercentage(): number {
    return ((this.currentStep() + 1) / this.steps.length) * 100;
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('grounding.errorTitle'),
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showWarning(message: string) {
    const alert = await this.alertCtrl.create({
      header: this.i18n.t('grounding.attentionTitle'),
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  // Helper methods for template
  getStepNumber(): number {
    return this.currentStep() + 1;
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  isLastStep(): boolean {
    return this.currentStep() === this.steps.length - 1;
  }

  getSuggestions(): string[] {
    const step = this.getCurrentStep();
    const suggestions = this.i18n.lang() === 'en' ? {
      see: ['chair', 'table', 'window', 'lamp', 'computer', 'plant', 'book', 'phone'],
      touch: ['keyboard', 'button', 'mug', 'surface', 'fabric', 'pen', 'handle', 'rug'],
      hear: ['weather', 'keyboard', 'voice', 'music', 'traffic', 'birds', 'wind', 'silence'],
      smell: ['coffee', 'perfume', 'food', 'fresh air', 'flowers', 'candle', 'paper', 'dust'],
      taste: ['water', 'coffee', 'mouth', 'toothpaste', 'candy', 'fruit', 'chocolate', 'salt']
    } : {
      see: ['sedia', 'tavolo', 'finestra', 'lampada', 'computer', 'pianta', 'libro', 'telefono'],
      touch: ['tastiera', 'bottone', 'tazza', 'superficie', 'tessuto', 'penna', 'maniglia', 'tappeto'],
      hear: ['clima', 'tastiera', 'voce', 'musica', 'traffico', 'uccelli', 'vento', 'silenzio'],
      smell: ['caffè', 'profumo', 'cibo', 'aria fresca', 'fiori', 'candela', 'carta', 'polvere'],
      taste: ['acqua', 'caffè', 'bocca', 'dentifricio', 'caramella', 'frutta', 'cioccolato', 'sale']
    };
    return suggestions[step.type]?.slice(0, 4) || [];
  }

  addSuggestion(suggestion: string) {
    const currentItems = [...this.userInput()];
    if (!currentItems.includes(suggestion) && currentItems.length < this.getExpectedCount()) {
      currentItems.push(suggestion);
      this.userInput.set(currentItems);
      this.userInputText.set(currentItems.join(', '));
    }
  }
}
