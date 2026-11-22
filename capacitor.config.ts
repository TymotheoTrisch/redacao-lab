import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.redacaolab.personal',
  appName: 'Redação Lab',
  loggingBehavior: 'none',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: { CapacitorSQLite: { androidIsEncryption: false } }
}
export default config
