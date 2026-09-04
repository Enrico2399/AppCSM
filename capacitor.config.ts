import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Prima erano ancora i valori segnaposto generati da 'ionic start':
  // mai cambiati, quindi nessuna app pubblicata da nessuna parte li usa.
  // Scelto un ID non legato a nessuna organizzazione specifica, solo al
  // progetto stesso.
  appId: 'com.csmdigitale.app',
  appName: 'CSM Digitale',
  webDir: 'www'
};

export default config;
