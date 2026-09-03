import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from '@ionic/core/loader';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Molte pagine dell'app usano ancora il vecchio IonicModule (da '@ionic/angular')
// invece dei singoli componenti standalone. In build di produzione il bundler
// elimina come 'inutilizzati' i componenti Ionic (ion-item, ion-label, ion-toggle,
// ion-select, ion-card, ion-input, ...) che non sono importati come standalone
// in modo esplicito: il custom element non viene mai registrato e il tag resta
// HTML sconosciuto, senza stile ne' Shadow DOM (es. il Profilo, dove le etichette
// e i toggle di Privacy/Preferenze si sovrapponevano senza alcuno stile).
// defineCustomElements registra qui tutti i componenti Ionic in un colpo, a
// prescindere da come ogni pagina li importa, chiudendo il problema alla radice.
defineCustomElements(window);

bootstrapApplication(AppComponent, appConfig) // <-- E deve essere passato qui
  .catch((err) => console.error(err));