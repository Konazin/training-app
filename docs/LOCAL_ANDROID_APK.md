# APK Android para backend local

Este perfil gera um APK comum para celular físico e permite HTTP na rede
local. A URL da API não fica no Git: ela é definida no ambiente `preview` do
projeto EAS.

## 1. Preparar o outro computador

Requisitos:

- Git;
- Node.js 20.19.4 ou superior;
- Java 21 e Maven para executar o backend;
- computador e celular conectados à mesma rede Wi-Fi.

Na raiz do repositório:

```powershell
npm ci
cd mobile
npx eas-cli@latest login
npx eas-cli@latest project:info
```

O projeto esperado é `@konaz/training-app`.

## 2. Descobrir o IP e iniciar o backend

No Windows, execute:

```powershell
ipconfig
```

Use o endereço IPv4 do adaptador Wi-Fi ativo. Depois inicie o backend local:

```powershell
cd backend
mvn spring-boot:run
```

O perfil `dev` usa H2 local, porta 8080 e autenticação desabilitada. Caso o
Firewall do Windows pergunte, permita o acesso em redes privadas.

Antes do build, abra no navegador do celular:

```text
http://IP_DO_COMPUTADOR:8080/api/health
```

Só prossiga se a resposta indicar `UP`.

## 3. Atualizar a URL do preview

Substitua `IP_DO_COMPUTADOR` pelo IPv4 encontrado:

```powershell
cd mobile
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value http://IP_DO_COMPUTADOR:8080/api --environment preview --visibility plaintext --scope project --non-interactive
npx eas-cli@latest env:list --environment preview
```

Não configure `EXPO_PUBLIC_API_TOKEN` para esse backend `dev`. Se usar o
compose/prod protegido, configure no EAS o mesmo token definido no backend.

## 4. Validar e gerar

Na raiz:

```powershell
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
$env:EXPO_NO_TELEMETRY='1'
npm exec --workspace=training-mobile -- expo install --check
npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist
```

Em `mobile/`:

```powershell
npx eas-cli@latest build --platform android --profile preview --non-interactive --json
```

O perfil `preview` gera APK, não AAB. Aguarde o status `FINISHED` e baixe o
artefato pela URL mostrada pela CLI ou pelo painel:

```text
https://expo.dev/accounts/konaz/projects/training-app/builds
```

Salve como:

```text
artifacts/training-app-preview-0.1.1.apk
```

Calcule o hash:

```powershell
Get-FileHash ..\artifacts\training-app-preview-0.1.1.apk -Algorithm SHA256
```

## Observações

- O APK se conecta ao IP incorporado no momento do build.
- Se o IP do computador mudar, atualize `EXPO_PUBLIC_API_URL` e gere outro APK.
- O celular não precisa de HTTPS, mas precisa permanecer na mesma rede local.
- `usesCleartextTraffic` está habilitado somente para viabilizar esse cenário
  HTTP local.
- APKs, `.env`, keystores, `android/`, `dist/` e arquivos de inspect são
  ignorados pelo Git.
