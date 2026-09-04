import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AnonymousSessionService } from '../../services/anonymous-session/anonymous-session.service';
import { addIcons } from 'ionicons';
import { personAddOutline, shieldCheckmarkOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-anonymous-welcome',
  templateUrl: './anonymous-welcome.component.html',
  styleUrls: ['./anonymous-welcome.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AnonymousWelcomeComponent implements OnInit, OnDestroy {
  // Prima questo componente teneva un proprio stato isOpen mai letto dal
  // template (nessun *ngIf lo usava): non aveva alcun effetto visivo, e non
  // era comunque mai stato presentato da nessuna parte dell'app - restava
  // scritto ma invisibile. Ora la visibilità è quella standard di un
  // ModalController: chi lo presenta decide quando, e closeWelcome() lo
  // chiude davvero con modalCtrl.dismiss() invece di un signal senza effetto.
  session = signal<any>(null);

  timeRemaining = computed(() => {
    const sess = this.session();
    if (!sess) return '';
    
    const now = new Date();
    const expiresAt = new Date(sess.expiresAt);
    
    if (now >= expiresAt) return 'Sessione scaduta';
    
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  });

  constructor(
    private anonymousSessionService: AnonymousSessionService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({ personAddOutline, shieldCheckmarkOutline, timeOutline });
  }

  ngOnInit() {
    // getCurrentSession() del servizio restituisce il Signal stesso, non il
    // suo valore (stesso pattern, con doppia chiamata, già usato correttamente
    // in help.page.ts): chiamarlo una sola volta qui avrebbe messo dentro
    // this.session il Signal invece dei dati della sessione, con
    // sess.expiresAt sempre undefined - "NaNh NaNm" mostrato all'utente al
    // posto del tempo rimanente, trovato leggendo il codice prima di
    // collegare questo componente per la prima volta.
    this.session.set(this.anonymousSessionService.getCurrentSession()());
  }

  ngOnDestroy() {
    // Cleanup se necessario
  }

  closeWelcome() {
    this.anonymousSessionService.markWelcomeSeen();
    this.modalCtrl.dismiss();
  }

  extendSession() {
    const currentSession = this.session();
    if (!currentSession) return;

    // Estendi sessione di altre 24 ore
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);
    
    const extendedSession = {
      ...currentSession,
      expiresAt: newExpiresAt.toISOString()
    };

    this.anonymousSessionService.saveSession(extendedSession);
    this.session.set(extendedSession);
  }

  createAccount() {
    this.anonymousSessionService.markWelcomeSeen();
    this.modalCtrl.dismiss();
    this.router.navigate(['/registration']);
  }
}
