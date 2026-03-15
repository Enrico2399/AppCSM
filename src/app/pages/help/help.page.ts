import { Component, signal, inject } from '@angular/core';
import { StorageService } from '../../services/storage/storage';
import { PopupService } from '../../services/popup/popup.service';
import { ProfileService } from '../../services/profile/profile.service';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';
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

  // Anonymous component persistence
  addedComponents = signal<any[]>([]);


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


  private storageService = inject(StorageService);
  public popupService = inject(PopupService);
  private profileService = inject(ProfileService);
  private anonymousSessionService = inject(AnonymousSessionService);

  ionViewWillEnter() {
    // Load from localStorage (old method)
    const savedPhone = this.storageService.getSosPhone();
    if (savedPhone) {
      this.trustPhone = savedPhone;
    }

    // Load from ProfileService (new method)
    this.loadSavedData();
    
    // Load anonymous components
    this.loadAnonymousComponents();
  }

  private loadSavedData() {
    const profile = this.profileService.getCurrentProfile()();
    if (profile) {
      // Load saved preferences
      if (profile.preferences?.trustPhone) {
        this.trustPhone = profile.preferences.trustPhone;
      }
      if (profile.preferences?.sosText) {
        this.sosText = profile.preferences.sosText;
      }
      if (profile.preferences?.comfortResource) {
        this.comfortResource = profile.preferences.comfortResource;
      }
      if (profile.preferences?.helpMode) {
        this.helpMode = profile.preferences.helpMode;
      }
    }
  }

  private loadAnonymousComponents() {
    const session = this.anonymousSessionService.getCurrentSession()();
    if (session && session.data.helpComponents) {
      this.addedComponents.set(session.data.helpComponents);
    }
  }

  addComponent(component: any) {
    const current = this.addedComponents();
    const newComponents = [...current, { ...component, id: Date.now(), timestamp: new Date().toISOString() }];
    this.addedComponents.set(newComponents);
    
    // Save to anonymous session
    const session = this.anonymousSessionService.getCurrentSession()();
    if (session) {
      this.anonymousSessionService.updateSessionData({
        helpComponents: newComponents
      });
    }
  }

  deleteComponent(componentId: number) {
    const current = this.addedComponents();
    const newComponents = current.filter(comp => comp.id !== componentId);
    this.addedComponents.set(newComponents);
    
    // Save to anonymous session
    const session = this.anonymousSessionService.getCurrentSession()();
    if (session) {
      this.anonymousSessionService.updateSessionData({
        helpComponents: newComponents
      });
    }
  }

  callNumber(num: string) {
    window.location.href = `tel:${num}`;
  }

  openWhatsApp(phone: string, message: string) {
    const formattedPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
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

  async executePlan() {
    // Save to localStorage (old method)
    this.storageService.setSosPhone(this.trustPhone);
    
    // Save to ProfileService (new method)
    this.saveHelpPreferences();
    
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
      this.popupService.showStatus("Attenzione", "Inserisci un numero di telefono!");
      return;
    }

    const planData = { mode: this.helpMode, phone: this.trustPhone, sosText: this.sosText, resource: this.comfortResource || "Respira profondamente. Tutto passerà.", issueText };
    this.generatedPlan.set(planData);
    
    // Save the generated plan to profile
    await this.saveGeneratedPlan();
    
    // Add component to anonymous persistence
    this.addComponent({
      type: 'help-plan',
      data: planData,
      timestamp: new Date().toISOString()
    });
  }

  private async saveGeneratedPlan() {
    try {
      const plan = {
        mode: this.helpMode,
        phone: this.trustPhone || undefined,
        sosText: this.sosText || undefined,
        resource: this.comfortResource || undefined,
        issueText: this.getIssueText(),
        selectedIssue: this.selectedIssue
      };

      const planId = await this.profileService.saveHelpPlan(plan);
      console.log('Help plan saved with ID:', planId);
    } catch (error) {
      console.error('Error saving help plan:', error);
    }
  }

  private getIssueText(): string {
    if (this.selectedIssue) {
      const issueMap: any = {
        'ansia': 'Ansia / Attacco di Panico',
        'suicidio': 'Pensieri Oscuri / Crisi Grave',
        'fisico': 'Dolore Fisico / Malessere',
        'rabbia': 'Rabbia Incontrollata'
      };
      return issueMap[this.selectedIssue] || this.selectedIssue;
    }
    return "Te stesso";
  }

  private async saveHelpPreferences() {
    try {
      const profile = this.profileService.getCurrentProfile()();
      const currentPreferences = profile?.preferences || {
        theme: 'dark',
        notifications: true,
        language: 'it'
      };

      const updatedPreferences = {
        ...currentPreferences,
        trustPhone: this.trustPhone,
        sosText: this.sosText,
        comfortResource: this.comfortResource,
        helpMode: this.helpMode,
        selectedIssue: this.selectedIssue
      };

      await this.profileService.savePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error saving help preferences:', error);
    }
  }

  // Auto-save when values change
  async onTrustPhoneChange() {
    await this.saveHelpPreferences();
  }

  async onSosTextChange() {
    await this.saveHelpPreferences();
  }

  async onComfortResourceChange() {
    await this.saveHelpPreferences();
  }

  async onHelpModeChange() {
    await this.saveHelpPreferences();
  }

  async onSelectedIssueChange() {
    await this.saveHelpPreferences();
  }

  // Help Plan Management
  getSavedPlans() {
    return this.profileService.getHelpPlans();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Oggi';
    } else if (diffDays === 2) {
      return 'Ieri';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} giorni fa`;
    } else {
      return date.toLocaleDateString('it-IT');
    }
  }

  async reusePlan(plan: any) {
    if (plan.isUsed) return;

    try {
      // Mark plan as used
      await this.profileService.markHelpPlanAsUsed(plan.id);
      
      // Load plan data into form
      this.selectedIssue = plan.selectedIssue;
      this.helpMode = plan.mode;
      
      if (plan.mode === 'wa') {
        this.trustPhone = plan.phone || '';
        this.sosText = plan.sosText || '';
      } else {
        this.comfortResource = plan.resource || '';
      }

      // Generate the plan again
      await this.executePlan();
      
      this.popupService.showStatus("Piano Riutilizzato", "Il piano è stato caricato e marcato come usato");
    } catch (error) {
      console.error('Error reusing plan:', error);
      this.popupService.showStatus("Errore", "Non è stato possibile riutilizzare il piano");
    }
  }

  async deletePlan(planId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo piano?')) return;

    try {
      await this.profileService.deleteHelpPlan(planId);
      this.popupService.showStatus("Piano Eliminato", "Il piano è stato rimosso con successo");
    } catch (error) {
      console.error('Error deleting plan:', error);
      this.popupService.showStatus("Errore", "Non è stato possibile eliminare il piano");
    }
  }

}
