Work on the repository:

Konazin/training-app

Base commit:

6dbc5bc21864a0a547f8622b2ba5e3b34348f1ec

Goal:

Complete the curated Wger starter-pack workflow, implement the real package
import, pass all automated gates, generate a verified Android APK, and mark
version 0.9.2 as GO-TESTS.

GO-TESTS means only:

- ready for installation and physical Android testing;
- automated validation passed;
- real APK generated and verified;
- physical smoke still pending;
- not approved for production or public release.

All user-facing text, documentation, commit messages and the final report must
be written in Brazilian Portuguese. Code identifiers may remain in English.

Do not fabricate successful tests, Wger IDs, provider data, URLs, licenses,
images, APK metadata, hashes or CI results.

======================================================================
1. CLOSED PRODUCT SCOPE
======================================================================

Preserve these product decisions:

- fresh installations start with zero exercises;
- fresh installations start with zero training plans;
- no demonstration plan;
- no generated exercise catalog;
- no automatic provider request;
- no network request during bootstrap, migration, foreground or render;
- SQLite remains the local source of truth;
- no login, server, VPS, cloud sync, analytics or telemetry;
- manual custom exercises remain supported;
- Wger remains the only implemented external provider;
- provider content is obtained only after an explicit user action;
- imported content remains available locally afterward;
- importing exercises never creates a training plan;
- no exercise descriptions or technical instructions may be written by Codex.

Do not modify `umamusume-mobile` functionally.

Do not add:

- AI-generated content;
- another provider;
- accounts;
- subscriptions;
- push notifications;
- background synchronization;
- automatic Wger refresh;
- automatic plan creation;
- automatic progression application.

======================================================================
2. RELEASE IDENTITY
======================================================================

Keep the candidate identity:

- app version: 0.9.2
- Android versionCode: 14
- Android package: com.konazin.trainingapp

Do not bump to 0.9.3 unless a real 0.9.2 APK was already successfully generated
and distributed outside the repository. The current repository documentation
states that no legitimate 0.9.2 APK exists.

Final implementation commit:

fix(mobile): complete curated starter pack import

Final release/documentation commit:

chore(mobile): mark 0.9.2 as go-tests candidate

======================================================================
3. CURRENT BLOCKERS THAT MUST BE CLOSED
======================================================================

The current repository has these known blockers:

1. the immutable manifest contains only 12 approved exercises;
2. the minimum GO-TESTS gate is 35;
3. the empty-library import button has an empty callback;
4. the onboarding package option is permanently disabled;
5. there is no real starter-pack import service;
6. there is no transactional batch import;
7. no package import progress or confirmation exists;
8. the current manifest validator relies on source regex instead of loading and
   validating the real structured manifest;
9. the CI workflow is incomplete;
10. the raw generated candidate audit remains tracked;
11. no real APK 0.9.2 has been generated or verified;
12. some documentation still describes outdated 50-of-50 behavior.

Do not declare GO-TESTS until all of these are resolved.

======================================================================
4. CURATION DECISION: 35 TO 50 REAL EXERCISES
======================================================================

The original list of 50 intentions is now a curation candidate pool, not a rule
that every original intention must be represented.

Final package rules:

- target: 40 approved exercises;
- minimum: 35 approved exercises;
- maximum: 50 approved exercises;
- zero rejected items included;
- zero fabricated provider identities;
- zero duplicate provider identities;
- zero duplicate effective movements;
- balanced coverage of common training needs.

The package must have reasonable coverage across:

- chest and upper-body push;
- back and upper-body pull;
- shoulders;
- arms;
- quadriceps;
- posterior chain and glutes;
- calves;
- core;
- bodyweight movements;
- mobility or conditioning.

Do not fill the package with obscure movements or several nearly identical
variations merely to reach the minimum.

The final package does not need to preserve unsupported original intentions.

When an original intention cannot be satisfied, it may be replaced by another
common and useful Wger exercise when:

- it is a real provider exercise;
- it is technically distinct from other selected items;
- it has valid provider content;
- it improves package coverage;
- the replacement is documented.

Do not stop after one search pass.

For unresolved intentions:

1. try the PT-BR query;
2. try provider Portuguese content;
3. try English terms;
4. search by known muscle and equipment metadata;
5. inspect full Wger exercise-info records;
6. inspect provider base/exercise relationships when applicable;
7. review nearby candidates manually;
8. replace unsupported intentions with other common exercises when justified.

Only finish with NO-GO when an exhaustive real-provider attempt still cannot
reach 35 valid exercises.

======================================================================
5. WGER CONTENT TRUST POLICY
======================================================================

The final manifest must not contain Codex-written:

- descriptions;
- execution instructions;
- technique explanations;
- muscles;
- equipment claims;
- attribution text;
- license claims.

These fields must be fetched from Wger at runtime after explicit user
confirmation.

The manifest may contain only reviewed identity and validation metadata such as:

- manifest version;
- semantic key;
- provider ID;
- Wger external ID;
- Wger base/exercise ID when applicable;
- original provider name;
- reviewed PT-BR display label;
- expected primary muscle;
- expected equipment;
- broad category;
- media policy;
- expected source URL;
- expected license identifier;
- expected real-media presence;
- review status;
- reviewed-at date.

The PT-BR display label may be manually reviewed, but it must not replace or
alter the original provider name.

Preserve both:

- original provider name;
- reviewed display label.

Do not translate technical instructions using Codex.

Language priority at import time:

1. Brazilian Portuguese supplied by Wger;
2. Portuguese supplied by Wger;
3. English supplied by Wger.

When English content is used, preserve it and identify its language.

======================================================================
6. MEDIA POLICY
======================================================================

Use a per-entry media policy.

`REQUIRED`:

- strength exercises;
- machine exercises;
- movements where setup or execution requires demonstration.

These must have:

- at least one real provider image;
- HTTPS media URL;
- correct exercise correspondence;
- source/author attribution when available;
- valid license metadata.

`OPTIONAL`:

- basic mobility;
- stretching;
- simple conditioning movements.

These may be accepted without an image only when:

- provider description or instructions are valid;
- exercise identity is unambiguous;
- the UI displays “Sem demonstração visual”;
- no generic placeholder pretends to demonstrate technique.

Do not use:

- AI-generated exercise images;
- unrelated stock photographs;
- generic illustrations labelled as exercise demonstrations;
- insecure HTTP media;
- fabricated attribution.

======================================================================
7. STRUCTURED IMMUTABLE MANIFEST
======================================================================

Complete the real production manifest with 35 to 50 approved entries.

The application must consume exactly this reviewed manifest.

The manifest must be:

- immutable;
- versioned;
- typed;
- deterministic;
- loaded as structured data;
- validated through actual runtime objects, not regex parsing;
- free from rejected candidates.

Keep or create a function similar to:

validateStarterPackManifest(manifest)

It must validate:

- count between 35 and 50;
- unique semantic keys;
- unique provider plus external ID;
- unique effective movement;
- supported provider;
- positive numeric external IDs where applicable;
- required identity fields;
- expected muscle;
- expected equipment;
- category;
- media policy;
- source URL format;
- license metadata;
- HTTPS media for REQUIRED entries;
- no `REJECTED`, `PENDING` or unreviewed entries;
- no empty display or original names;
- no generated description or instruction fields.

The CI validator must import and validate the actual manifest.

Do not count lines with regular expressions.

Do not validate only synthetic test fixtures.

Add a test that passes the production manifest itself to the domain validator.

======================================================================
8. REAL STARTER-PACK IMPORT ARCHITECTURE
======================================================================

Implement a complete user-triggered starter-pack import flow.

Suggested layers:

- domain pack validation and result types;
- Wger exact-ID fetch service;
- mobile import controller;
- SQLite transactional batch-import repository operation;
- mobile confirmation/progress/result UI.

Suggested controller states:

type StarterPackImportState =
  | { status: 'IDLE' }
  | { status: 'CONFIRMING'; count: number }
  | { status: 'FETCHING'; completed: number; total: number }
  | { status: 'DOWNLOADING_MEDIA'; completed: number; total: number }
  | { status: 'VALIDATING'; total: number }
  | { status: 'AWAITING_PARTIAL_CONFIRMATION'; valid: number; unavailable: PackFailure[] }
  | { status: 'COMMITTING'; total: number }
  | { status: 'SUCCESS'; imported: number; skipped: number }
  | { status: 'ERROR'; message: string }

Equivalent typed states are acceptable.

The package import must:

1. start only after a visible user action;
2. show a confirmation before the first request;
3. fetch the exact external IDs from the approved manifest;
4. never search for automatic replacements at runtime;
5. retrieve current Wger metadata;
6. retrieve provider descriptions and instructions;
7. retrieve muscles, equipment, category, language and attribution;
8. retrieve valid real media;
9. compare current provider identity with manifest expectations;
10. stage all valid provider records;
11. stage media files when caching is enabled;
12. validate the staged set;
13. ask explicit confirmation when some items are unavailable;
14. insert the approved selected set in one SQLite transaction;
15. report imported, skipped and failed counts;
16. leave the existing library intact on pre-commit failure;
17. work offline after successful local persistence.

No network operation may begin merely because a component rendered.

======================================================================
9. UNAVAILABLE PROVIDER ITEMS
======================================================================

When one or more approved IDs become unavailable or no longer satisfy the
manifest:

- show the exact failed exercise names/keys;
- show a concise reason;
- do not silently replace them;
- do not silently import a different search result;
- default action is cancellation;
- allow “Importar somente os disponíveis” after explicit confirmation;
- commit the selected valid subset atomically;
- record skipped manifest keys in the result;
- do not claim the complete package was imported.

The runtime subset may contain fewer than 35 when provider data changed after
release, but the immutable release manifest itself must contain at least 35
approved entries.

======================================================================
10. SQLITE TRANSACTIONAL BATCH IMPORT
======================================================================

Add a repository operation such as:

importProviderExercisesBatch(input)

It must run inside one SQLite transaction.

Requirements:

- all selected rows import or none import;
- provider plus external ID deduplication;
- no duplicate external references;
- no duplicate media rows;
- no duplicate aliases;
- preserve existing CUSTOM exercises;
- preserve existing WGER user notes;
- preserve favorites;
- preserve recent usage;
- preserve archive state unless explicitly restored;
- preserve local user edits that are intentionally user-owned;
- do not create a plan;
- do not create a session;
- do not create history;
- no nested transaction;
- rollback on injected failure;
- idempotent repeated package import.

The result should expose:

- imported;
- alreadyPresent;
- updated;
- skipped;
- failures.

Do not count an already imported provider exercise as newly imported.

======================================================================
11. MEDIA DOWNLOAD AND OFFLINE USE
======================================================================

After explicit confirmation, cache at least one primary image for REQUIRED
starter-pack exercises.

Use application-owned storage.

Suggested staged flow:

1. create a temporary import directory;
2. download approved HTTPS media;
3. validate HTTP success;
4. validate MIME type;
5. validate file size;
6. enforce per-file and total-size limits;
7. create deterministic destination names;
8. keep temporary files outside permanent media paths;
9. commit SQLite rows only after required media has been validated;
10. move files into final paths in a controlled commit/finalization sequence;
11. clean temporary files after success or failure;
12. prevent permanent orphan files after rollback.

When atomicity across SQLite and filesystem cannot be literal:

- use an explicit staged state;
- never expose incomplete rows;
- reconcile and clean files deterministically;
- document the consistency strategy;
- test failure between database and file finalization.

Optional-media items may be imported without media.

Do not include media bytes inside JSON backups.

Backups preserve:

- remote media URL;
- attribution;
- license;
- local cache metadata where applicable.

After restore, missing local media must fall back safely without an automatic
network request.

======================================================================
12. EMPTY LIBRARY UI
======================================================================

Replace the current no-op callback.

When the production manifest passes the gate, show:

“Importar pacote recomendado · X exercícios”

Where X is the actual approved manifest count.

The button must:

- use `recommendedPackEnabled(...)`;
- open the import confirmation;
- never use an empty callback;
- remain disabled below the gate;
- expose an accessible disabled state;
- show the real count;
- not hardcode 35, 40 or 50 in the visual label.

Keep:

- “Pesquisar no Wger”
- “Criar exercício personalizado”
- “Continuar sem exercícios”

Display:

“O pacote recomendado contém exercícios revisados individualmente. A quantidade
pode variar conforme a disponibilidade e a qualidade dos dados do provider.”

Also explain:

- internet is required for the initial provider import;
- imported content remains on the device;
- nothing is downloaded automatically;
- no training plan will be created.

======================================================================
13. ONBOARDING INTEGRATION
======================================================================

The onboarding package action must use the same gate and manifest as the
library.

It must not remain permanently disabled when the manifest is valid.

On the final onboarding step:

- show the actual package count;
- allow package import when enabled;
- allow Wger manual search;
- allow custom exercise creation;
- allow continuing without exercises;
- do not trigger provider calls during render;
- do not force import;
- do not force plan creation.

The import may:

- open the library import flow;
- or use the same shared controller inside onboarding.

Do not create a second independent implementation.

Retest the previously collapsed Android modal:

- first automatic opening;
- next steps;
- completion;
- skip;
- Android back;
- reopening;
- small screen;
- large fonts;
- all themes.

======================================================================
14. MANUAL WGER SEARCH
======================================================================

Preserve manual Wger search independently from the recommended package.

Validate:

- user-triggered request only;
- free-text query;
- pagination;
- PT/English provider fallback;
- exercise preview;
- source and attribution;
- individual import;
- multi-selection import when already implemented;
- duplicate detection;
- local persistence;
- no bootstrap request;
- no automatic import.

Use the same provider parsing and storage rules as the package import where
possible.

Do not maintain two contradictory Wger mapping implementations.

======================================================================
15. REMOVE RAW GENERATED AUDIT FROM GIT
======================================================================

The existing raw candidate audit is already tracked.

Adding it to `.gitignore` is insufficient.

Remove the tracked raw generated audit using Git, while preserving a concise
auditable summary.

Keep versioned:

- final manifest;
- human-readable curation summary;
- approved count;
- rejected count;
- replacement decisions;
- provider timestamp;
- regeneration command;
- optional hash of the raw audit.

Store future raw outputs only under an ignored path such as:

artifacts/curation/

Verify with:

git ls-files | grep -E 'candidate-audit|artifacts/curation'

The command must not show a tracked raw API dump.

======================================================================
16. CURATION DOCUMENTATION
======================================================================

Update `docs/WGER_STARTER_PACK_CURATION.md`.

It must list every approved entry with:

- semantic key;
- Wger external ID;
- original provider name;
- reviewed display name;
- category;
- primary muscle;
- equipment;
- media policy;
- media status;
- language;
- source;
- license;
- review outcome.

Document replacements:

- original unsupported intention;
- approved replacement;
- reason.

Do not claim all original 50 intentions were approved unless true.

Do not say the production manifest was not generated after it exists.

======================================================================
17. ACTUAL MANIFEST VALIDATION COMMAND
======================================================================

Replace the regex-based validator.

`npm run validate:wger-manifest` must:

- load the actual production manifest;
- execute the domain validator;
- print approved count;
- print min/max gate;
- print media REQUIRED count;
- print media OPTIONAL count;
- print entries without media;
- print duplicate checks;
- exit non-zero on any violation.

It must not:

- count source lines;
- search source strings for `REJECTED`;
- trust documentation values;
- call Wger;
- depend on network;
- mutate files.

Add tests for the validation command or its underlying pure function.

======================================================================
18. COMPLETE CI WORKFLOW
======================================================================

Fix `.github/workflows/mobile-validation.yml`.

Use Node compatible with the repository engines.

Run at least:

- checkout;
- Node setup with npm cache;
- `npm ci`;
- domain typecheck;
- domain tests;
- local-db typecheck;
- local-db SQLite tests;
- Wger package typecheck;
- Wger package tests;
- mobile typecheck;
- mobile Vitest tests;
- mobile behavioral Jest/RNTL tests;
- Umamusume typecheck;
- structured manifest validation;
- Expo dependency check;
- Expo Doctor;
- Android Expo export;
- `git diff --check`;
- tracked raw-audit check.

Do not call the live Wger API in CI.

Do not build a signed APK in pull-request CI when credentials are unavailable.

The CI must validate deterministic local code and manifest data.

Ensure `.eas-inspect`, `.expo` and export folders are not collected as tests.

After pushing, inspect the actual workflow result.

Do not claim CI success while no run exists or while it is still pending.

======================================================================
19. REGRESSION GATE FOR MARCO 6
======================================================================

Do not redesign the Marco 6 features.

Run regression tests for:

- substituted exercise effective identity;
- history assigned to the performed substitute;
- original planned exercise preserved for audit;
- previous-load reference after substitution;
- duplicate substitution prevention;
- atomic progression application;
- no load increase without valid RPE;
- set fields updating after suggestion;
- set notes;
- exercise annotations;
- session notes;
- process restart;
- completed and abandoned history;
- backup and restore;
- post-restore preference retry;
- retry never repeats SQLite restore;
- legacy generated exercises remain archived;
- fresh installation remains empty;
- no network during startup.

Fix only genuine regressions.

======================================================================
20. REQUIRED DOMAIN TESTS
======================================================================

Add or update tests for:

- production manifest itself passes validation;
- approved count between 35 and 50;
- no rejected entries;
- unique intent keys;
- unique provider identities;
- unique effective movements;
- correct media policies;
- REQUIRED media missing;
- OPTIONAL media missing;
- invalid HTTPS URL;
- invalid license metadata;
- invalid source metadata;
- unsupported provider;
- empty provider name;
- runtime provider identity mismatch;
- immutable inputs;
- balanced category coverage check or documented coverage summary.

Do not test only synthetic fixtures.

======================================================================
21. REQUIRED WGER TESTS
======================================================================

Using mocks or fixtures from real provider response shapes, test:

- fetch by exact approved external ID;
- PT-BR preference;
- Portuguese fallback;
- English fallback;
- description/instruction parsing;
- muscles;
- equipment;
- source;
- license;
- media;
- malformed response;
- unavailable ID;
- identity mismatch;
- HTTPS validation;
- timeout;
- cancellation;
- pagination for manual search;
- no automatic replacement.

Do not call the live provider in normal automated tests.

======================================================================
22. REQUIRED SQLITE TESTS
======================================================================

Test with real SQLite:

- fresh database contains zero exercises and zero plans;
- first package import;
- repeated package import;
- partial library already containing Wger items;
- CUSTOM name conflict;
- provider external-ID conflict;
- user notes preserved;
- favorite preserved;
- recent usage preserved;
- archive state preserved;
- aliases imported once;
- media imported once;
- rollback on exercise insertion failure;
- rollback on media insertion failure;
- rollback on alias insertion failure;
- no plan created;
- no session created;
- no provider request during restore;
- old backup compatibility;
- package not automatically recreated after restore;
- legacy generated exercises remain hidden.

======================================================================
23. REQUIRED MOBILE BEHAVIORAL TESTS
======================================================================

Test rendered behavior for:

- empty library package button enabled when manifest is valid;
- disabled below the minimum using a dependency-injected test manifest;
- actual count displayed;
- button opens confirmation;
- no request during initial render;
- cancel before request;
- fetch progress;
- media progress;
- validation progress;
- success result;
- already-present result;
- partial-provider-failure summary;
- explicit valid-subset confirmation;
- full failure;
- cancellation;
- no double tap;
- retry does not duplicate imports;
- no plan creation;
- onboarding package action;
- continue without exercises;
- Wger manual search action;
- custom exercise action;
- large fonts;
- small Android screen;
- accessibility roles and states.

Do not replace behavior tests with source-string checks.

======================================================================
24. LOCAL VALIDATION COMMANDS
======================================================================

Run from the repository root.

Clean generated output first:

rm -rf mobile/.eas-inspect mobile/.expo mobile/dist artifacts/curation/tmp

Install:

npm ci

Run all workspace checks:

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

npm run typecheck --workspace=@training/training-wger
npm run test --workspace=@training/training-wger

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run test:behavior --workspace=training-mobile

npm run typecheck --workspace=umamusume-mobile

Run the real manifest validation:

npm run validate:wger-manifest

Check Expo dependencies:

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check

Run Expo Doctor:

cd mobile
npx expo-doctor
cd ..

Generate Android JS export:

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

Rerun mobile tests after export:

npm run test --workspace=training-mobile
npm run test:behavior --workspace=training-mobile

Repository checks:

git diff --check
git status --short
git ls-files | grep -E 'candidate-audit|artifacts/curation' || true

Record exact:

- suite counts;
- test counts;
- warnings;
- skipped tests;
- command exit codes.

Do not hide or skip legitimate SQLite tests.

When `better-sqlite3` has a Node ABI mismatch, rebuild it for the active Node
version and rerun the complete SQLite suite.

======================================================================
25. ANDROID APK BUILD
======================================================================

Do not generate the APK until every mandatory local validation passes.

Keep the existing EAS `preview` profile configured as:

- internal distribution;
- Android APK;
- no development-server dependency.

Build with:

cd mobile
npx eas-cli@latest build --platform android --profile preview --json

Use `--non-interactive` only when credentials are already configured.

When EAS cloud is unavailable and the local Android toolchain is valid:

npx eas-cli@latest build --platform android --profile preview --local

Do not treat `expo export` as an APK.

Download or copy the finished APK to:

artifacts/training-app-0.9.2-go-tests.apk

Verify:

file artifacts/training-app-0.9.2-go-tests.apk
sha256sum artifacts/training-app-0.9.2-go-tests.apk
unzip -t artifacts/training-app-0.9.2-go-tests.apk

Confirm:

- it is an APK, not AAB;
- ZIP integrity passes;
- version is 0.9.2;
- versionCode is 14;
- package is com.konazin.trainingapp.

Do not commit:

- APK;
- AAB;
- keystore;
- credentials;
- downloaded provider media;
- temporary Wger responses;
- `.eas-inspect`;
- `.expo`;
- `dist`;
- raw curation dumps.

======================================================================
26. CI VALIDATION AFTER PUSH
======================================================================

Push the final commits.

Inspect the actual GitHub Actions run for the final commit.

Record:

- workflow name;
- workflow run ID;
- conclusion;
- failing job when applicable;
- relevant warning.

GO-TESTS requires a successful `mobile-validation` workflow run.

When GitHub Actions cannot run for an external platform reason:

- report it explicitly;
- do not claim CI success;
- final state remains NO-GO until the run succeeds.

======================================================================
27. DOCUMENTATION
======================================================================

Update:

- README.md
- docs/PRODUCT_ROADMAP.md
- docs/EXERCISE_LIBRARY.md
- docs/EXERCISE_MEDIA.md
- docs/WGER_INTEGRATION.md
- docs/PROVIDER_ARCHITECTURE.md
- docs/WGER_STARTER_PACK_CURATION.md
- docs/BACKUP_AND_RESTORE.md
- docs/MARCO_6_ANDROID_SMOKE.md
- docs/RELEASE_CANDIDATE_0_9_2.md
- docs/LOCAL_ANDROID_APK.md

The release document must contain:

- status;
- manifest version;
- approved count;
- rejected count included;
- original intentions replaced;
- REQUIRED media count;
- OPTIONAL media count;
- entries without media;
- all validation commands;
- test counts;
- CI run and result;
- APK build ID;
- APK filename;
- APK size;
- SHA-256;
- physical smoke status;
- known warnings.

Use exactly:

GO-TESTS
PHYSICAL ANDROID SMOKE: PENDING
PRODUCTION RELEASE: NOT APPROVED

Also include:

“GO-TESTS autoriza apenas o teste em dispositivo Android físico. Não representa
aprovação para publicação ou uso em produção.”

Do not mark any physical test as completed.

======================================================================
28. PHYSICAL SMOKE CHECKLIST
======================================================================

Prepare but leave all items PENDING:

- clean installation;
- upgrade from 0.9.0 when technically supported;
- startup in airplane mode;
- empty library on clean install;
- onboarding visible;
- onboarding navigation;
- continue without exercises;
- no startup network request;
- package confirmation;
- package import;
- package media;
- import repeated without duplicates;
- manual Wger search;
- custom exercise creation;
- plan creation;
- workout start;
- set editing;
- annotations;
- pause;
- process restart;
- resume;
- substitution;
- previous performance;
- local progression;
- history;
- backup export;
- backup restore;
- theme;
- large font;
- TalkBack;
- no hidden or overlapping controls;
- no dependency on server, VPS or computer.

======================================================================
29. HARD STOP CONDITIONS
======================================================================

Finish with NO-GO instead of manipulating the gate when any condition remains:

- fewer than 35 approved manifest entries;
- more than 50 manifest entries;
- a rejected or unreviewed entry is included;
- duplicate provider identity;
- duplicate effective movement;
- generated description or instruction;
- missing required attribution;
- missing required media;
- package button still has an empty callback;
- onboarding package action remains permanently disabled;
- import is not transactional;
- repeated import duplicates data;
- package creates a plan;
- startup performs provider requests;
- restore automatically imports the package;
- raw API dump remains tracked;
- regex-based manifest validation remains;
- any mandatory typecheck or test fails;
- Expo validation fails;
- GitHub Actions fails or has no successful final run;
- APK build fails;
- APK does not exist;
- APK integrity cannot be verified;
- known high-impact bug remains;
- physical smoke is falsely marked complete.

Do not lower the 35-entry gate.

Do not add invented exercises to satisfy the gate.

Do not change documentation to GO-TESTS without the actual APK and evidence.

======================================================================
30. FINAL REPORT
======================================================================

Write the final response in Brazilian Portuguese.

Include:

1. base commit;
2. implementation commit;
3. release commit;
4. approved exercise count;
5. selected Wger IDs;
6. rejected count included;
7. replaced intentions;
8. manifest version;
9. REQUIRED and OPTIONAL media counts;
10. entries without media;
11. import architecture;
12. SQLite transaction behavior;
13. repeated-import result;
14. migrations added or confirmation of none;
15. exact typecheck results;
16. exact Vitest results;
17. exact SQLite test results;
18. exact Jest/RNTL results;
19. Expo dependency-check result;
20. Expo Doctor result;
21. Android export result;
22. GitHub Actions run ID and conclusion;
23. APK build method;
24. EAS build ID;
25. APK path;
26. APK filename;
27. APK size;
28. APK SHA-256;
29. ZIP integrity result;
30. physical smoke status;
31. remaining warnings;
32. final decision.

The final decision must be exactly one of:

GO-TESTS

or:

NO-GO PARA TESTES

Do not report GO-TESTS unless every automated, CI and APK requirement has
objective evidence.