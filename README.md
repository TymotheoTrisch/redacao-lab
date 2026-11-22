# Redação Lab para Android

O primeiro APK de desenvolvimento reúne cinco módulos de estudo, dez aulas e 25 exercícios originais com explicações. Na Biblioteca, pesquise uma palavra do título ou do texto, abra uma aula e avance entre os blocos. Selecione um trecho para destacar, comentar e editar sua anotação. A opção Reforço guarda aulas para revisão. Em Preferências, ajuste a data da prova, os dias, o tempo de estudo e o tema.

O app usa assets embarcados e SQLite no espaço privado do Android. A prévia no navegador permite ler o catálogo. Os recursos de persistência usam o plugin nativo. Nesta versão, os exercícios oferecem conferência de gabarito. O histórico de tentativas e o diagnóstico estão previstos em B05.

## Instalação do debug

APK desta compilação no Windows:

    C:\PROJETOS\Redacao-Lab\android\app\build\outputs\apk\debug\app-debug.apk

Para a primeira instalação em um telefone autorizado, com o cabo USB conectado, execute na raiz:

```powershell
$adb = '.\.tools\android-sdk\platform-tools\adb.exe'
& $adb devices
& $adb install '.\android\app\build\outputs\apk\debug\app-debug.apk'
```

Instale em aparelho identificado como `device`. Se houver vários, selecione o serial com `-s`. O comando de primeira instalação falha se o pacote já existe. Para uma atualização deliberada, confira o certificado da versão instalada, preserve a chave e use um APK com versionCode maior. A desinstalação apaga o banco privado.

| Propriedade | Build local |
|---|---|
| Aplicativo | com.redacaolab.personal |
| Versão | 0.1.0, versionCode 1 |
| Android mínimo / alvo | API 23 / 35 |
| SHA-256 do APK debug | b52ed503d770105a9ef37eddc5f33c4cad3f83bc76884a33b1affff8cf5ad5bd |
| SHA-256 do certificado debug | 737ccfbe30a6316e7d805fed5c50dbfc54697c6d51376056aa066be723a8c120 |

O certificado debug é local. Um build em outra máquina pode ter outra assinatura. A chave privada fica fora do Git. A assinatura de release e os testes de atualização entre APKs serão tratados em B13.

## Reproduzir a compilação

Ferramentas validadas no Windows: Node 24.18.1, JDK 21.0.1, Gradle Wrapper 8.11.1, Capacitor 7.6.10, plugin SQLite 7.0.3, Android SDK Platform 35 e Build Tools 34.0.0/35.0.0. Nesta máquina o SDK fica em `.tools/android-sdk`. Configure o Node compatível no PATH. O Gradle usa o wrapper do repositório. [Ferramentas oficiais do Android](https://developer.android.com/studio)

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = (Resolve-Path '.tools/android-sdk').Path
npm ci
npm run lint
npm test
npm run build
npm run android:sync
.\android\gradlew.bat -p android :app:assembleDebug :app:assembleDebugAndroidTest
python tests/android-package.py android/app/build/outputs/apk/debug/app-debug.apk
python tests/android-manifest.py android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml
& "$env:ANDROID_HOME/build-tools/35.0.0/apksigner.bat" verify --verbose --print-certs android/app/build/outputs/apk/debug/app-debug.apk
```

A CI usa um emulador descartável, instala o APK e a instrumentação, ativa o modo avião e encerra o processo entre gravação e releitura. O roteiro `tests/android-offline.sh` exige emulador sem instalação anterior. Resultados e pendências ficam no [backlog](BACKLOG.md).

## Manutenção

O catálogo está em `public/content/catalog.json`. Ao alterar o pacote, incremente sua versão. Ao alterar os blocos de uma aula, incremente também a versão do módulo. Os offsets de anotações são UTF-16. O banco mantém versões antigas e guarda a citação mesmo que ela deixe de ter correspondência inequívoca. Acrescente migrations sequenciais e teste reabertura, erro e rollback com dados sintéticos.

As especificações de produto, armazenamento e conteúdo continuam em [PRD](PRD.md), [DATABASE](DATABASE.md) e [CONTENT](CONTENT.md). As regras para versões futuras estão em [ARCHITECTURE](ARCHITECTURE.md), [SECURITY](SECURITY.md), [AI_INTEGRATION](AI_INTEGRATION.md) e [AGENTS](AGENTS.md).
