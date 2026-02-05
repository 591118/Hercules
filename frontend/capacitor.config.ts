import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.hercules.app',
  appName: 'Hercules',
  webDir: 'dist',
  server: {
    // I produksjon kan du sette url til din backend/web for live reload
    // androidScheme: 'https',
  },
};

export default config;
