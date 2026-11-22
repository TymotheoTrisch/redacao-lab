# Redação Lab — especificação v1.0
Aplicativo Android pessoal, local-first, para preparação à Unisinos 2027/1 e evolução posterior. Este pacote contém especificações, não código executável nem APK.

## Começar
1. Extraia este ZIP na raiz de uma pasta nova, por exemplo C:\Repositorios\redacao-lab.
2. Abra a pasta no Codex. Leia AGENTS.md e envie o conteúdo de PROMPT_INICIAL.md.
3. Instale Node.js LTS, Android Studio, Android SDK e JDK compatíveis com a versão estável do Capacitor escolhida. O agente deve verificar versões e registrar pré-requisitos reais antes de instalar dependências.
4. Conecte o celular por USB com depuração autorizada ou instale o APK gerado manualmente. Desative a depuração ao finalizar.

## Documentos
PRD: produto; ARCHITECTURE: decisões e evolução; DATABASE: contratos de persistência; SECURITY: proteção; CONTENT: material pedagógico; AI_INTEGRATION: fluxo sem API paga; BACKLOG: entrega incremental; AGENTS: regras do agente; PROMPT_INICIAL: execução.

## Comandos esperados após implementação
`npm ci`, `npm run dev`, `npm run test`, `npm run build`, `npx cap sync android` e, em android no Windows, `.\gradlew.bat assembleDebug` para teste. Release assinada mediante configuração local; nunca guardar senha ou keystore no Git. O agente deverá documentar caminhos reais dos APKs e comandos efetivamente testados.

## Decisões fixas
Um usuário, um dispositivo, sem servidor, login, telemetria ou sincronização. SQLite privado; internet apenas para dados públicos e IA por ação do usuário. Nenhuma dependência de IA para estudar offline. Não confundir protótipo com entrega comprovada.
