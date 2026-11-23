# Perfil pessoal local

O perfil pessoal prepara os 15 pares em `Redacao-Lab-Dados-Referencia-Privados/reference-private/{conversa,quiz}`. O conversor valida as fontes na compilação web e escreve o pacote em `.tools/personal-web`, diretório local ignorado pelo Git. Ao abrir o aplicativo no Android, o SQLite recebe apenas os módulos ausentes, em uma transação. Esse comportamento vale para instalações novas e atualizações. Uma importação anterior conserva sua edição e suas anotações. Depois que todos os módulos estão no banco, as aberturas seguintes dispensam a leitura do pacote.

Para preparar uma futura compilação pessoal no Windows, use Node compatível com o projeto e execute na raiz:

```powershell
npm.cmd run build -- --mode personal
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o perfil pessoal.' }
cmd /d /c "set REDACAO_LAB_PROFILE=personal&& npm.cmd run android:sync"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar os assets pessoais.' }
```

O segundo comando limita o perfil pessoal ao processo de sincronização. Os assets nativos gerados passam a conter material de uso privado. Uma futura compilação e instalação local devem seguir as instruções de assinatura e atualização do projeto.

### Retornar à distribuição pública

Antes de compilar qualquer APK para distribuição, prepare o pacote autoral e sincronize o perfil público explicitamente:

```powershell
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o perfil público.' }
cmd /d /c "set REDACAO_LAB_PROFILE=public&& npm.cmd run android:sync"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar os assets públicos.' }
```

Essa sincronização substitui os assets gerados no projeto Android pelo conteúdo de `dist`. Após a compilação pública, valide o APK com `python tests/android-package.py caminho/do/aplicativo.apk`. A CI pública usa o perfil padrão e funciona sem a pasta de referência privada.
