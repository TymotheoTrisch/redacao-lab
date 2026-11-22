import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.redacaolab.personal',
  appName: 'Redação Lab',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: { CapacitorSQLite: { androidIsEncryption: false } }
}
export default config
