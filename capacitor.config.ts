import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.redacaolab.personal',
  appName: 'Redação Lab',
  loggingBehavior: 'none',
  webDir: process.env.REDACAO_LAB_PROFILE === 'personal' ? '.tools/personal-web' : 'dist',
  android: { allowMixedContent: false, adjustMarginsForEdgeToEdge: 'auto' },
  plugins: { CapacitorSQLite: { androidIsEncryption: false } }
}
export default config
