# Redação Lab para Android

A versão 0.2.0 traz cinco módulos autorais, dez aulas e 25 exercícios. Na Biblioteca, abra uma aula ou retome o último trecho. O módulo inteiro rola na mesma tela. Escolha uma alternativa e toque em **Conferir resposta** para ver o gabarito e a explicação ali mesmo. As tentativas ficam no SQLite. Em **Reforço → Diagnóstico por competência**, consulte os acertos nas últimas 20 respostas e a quantidade de evidências.

Ao selecionar um trecho, toque em uma cor para grifar ou em **Anotar trecho** para comentar. Toque em um destaque para editá-lo. O ícone no canto inferior direito abre **Notas do módulo**, com uma nota geral e os trechos marcados das aulas. **Salvar e voltar** fecha o painel mantendo a posição de leitura. O padrão de aparência é escuro. Uma escolha de tema já salva continua valendo.

### Módulos de referência no celular

Em **Preferências → Importar referências privadas**, selecione os arquivos locais `moduloN.json` da pasta de conversas e `moduloN_quiz.json` da pasta de quiz. É possível adicioná-los em duas seleções. Toque em **Conferir importação**, revise a lista de módulos e toque em **Confirmar importação**. Os módulos entram na Biblioteca do dispositivo. O APK distribuído contém o material autoral. A reimportação de um pacote idêntico preserva as notas e as respostas.

## Instalar ou atualizar o debug

No celular, entre na conta GitHub do projeto, abra a página do APK de teste, baixe o arquivo em **Assets** e toque em **Atualizar** sobre a 0.1.0. A cópia local no Windows fica em:

    C:\PROJETOS\Redacao-Lab\artifacts\debug\redacao-lab-0.2.0-debug.apk

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
| Versão | 0.2.0, versionCode 2 |
| Android mínimo / alvo | API 23 / 35 |
| SHA-256 do APK debug | d6697f83400fb89deccdf5462a82ed49a53d98dde26b43ed33faa24c73b15d0a |
| SHA-256 do certificado debug | 737ccfbe30a6316e7d805fed5c50dbfc54697c6d51376056aa066be723a8c120 |

O certificado debug é local. Um build em outra máquina pode ter outra assinatura. A chave privada fica fora do Git. A assinatura de release permanece em B13. A CI compila a 0.1.0 com a mesma chave de teste do runner para exercer a atualização com dados sintéticos.

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
