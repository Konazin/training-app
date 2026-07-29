package com.trainingapp.integration.wger.service;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class WgerExerciseSyncService {
    private final WgerExerciseClient client;
    private final WgerExerciseMapper mapper;
    private final WgerProperties properties;
    private final ExerciseDefinitionRepository exercises;
    private final WgerSyncRunRepository runs;
    private final TransactionTemplate transactions;
    // ponytail: o beta executa uma instância; mover este lease para o PostgreSQL ao escalar horizontalmente.
    private final AtomicBoolean running = new AtomicBoolean();

    public WgerExerciseSyncService(WgerExerciseClient client, WgerExerciseMapper mapper, WgerProperties properties,
                                   ExerciseDefinitionRepository exercises, WgerSyncRunRepository runs,
                                   PlatformTransactionManager transactionManager) {
        this.client = client;
        this.mapper = mapper;
        this.properties = properties;
        this.exercises = exercises;
        this.runs = runs;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public WgerSyncSummary sync(boolean dryRun) {
        if (!properties.integrationEnabled()) throw new DomainConflictException("Integração Wger desabilitada");
        if (!running.compareAndSet(false, true)) throw new DomainConflictException("Sincronização Wger já está em execução");
        WgerSyncRun run = new WgerSyncRun();
        run.setStatus("RUNNING");
        run.setDryRun(dryRun);
        run.setStartedAt(OffsetDateTime.now());
        run = runs.save(run);
        try {
            Map<String, Integer> languages = client.languages().results().stream()
                    .collect(Collectors.toMap(WgerLanguage::shortName, WgerLanguage::id, (a, b) -> a));
            Integer language = languages.get(languageCode(properties.language()));
            Integer fallback = languages.get(languageCode(properties.fallbackLanguage()));
            int offset = 0;
            while (true) {
                var page = client.exercises(offset);
                int[] counts = dryRun ? inspect(page.results())
                        : transactions.execute(status -> persist(page.results(), language, fallback));
                run.setCreated(run.getCreated() + counts[0]);
                run.setUpdated(run.getUpdated() + counts[1]);
                run.setSkipped(run.getSkipped() + counts[2]);
                run.setFailed(run.getFailed() + counts[3]);
                run.setPages(run.getPages() + 1);
                runs.save(run);
                if (page.next() == null || (properties.syncMaxPages() > 0 && run.getPages() >= properties.syncMaxPages())) break;
                offset += Math.max(1, properties.pageSize());
            }
            run.setStatus(run.getFailed() == 0 ? "COMPLETED" : "PARTIAL");
            run.setMessage(dryRun ? "Simulação concluída sem persistência" : "Sincronização concluída");
        } catch (RuntimeException exception) {
            run.setStatus(run.getPages() > 0 ? "PARTIAL" : "FAILED");
            run.setMessage(limit(exception.getMessage()));
        } finally {
            run.setFinishedAt(OffsetDateTime.now());
            run = runs.save(run);
            running.set(false);
        }
        return WgerSyncSummary.from(run);
    }

    public WgerSyncSummary status() {
        return runs.findFirstByOrderByStartedAtDesc().map(WgerSyncSummary::from)
                .orElse(new WgerSyncSummary(null, "NEVER_RUN", false, null, null, 0, 0, 0, 0, 0, null));
    }

    private int[] persist(java.util.List<WgerExerciseInfo> source, Integer language, Integer fallback) {
        int[] result = new int[4];
        for (var item : source) {
            try {
                var existing = exercises.findBySourceAndExternalId(ExerciseSource.WGER, String.valueOf(item.id()));
                ExerciseDefinition exercise = existing.orElseGet(ExerciseDefinition::new);
                OffsetDateTime now = OffsetDateTime.now();
                if (exercise.getCreatedAt() == null) exercise.setCreatedAt(now);
                exercise.setUpdatedAt(now);
                mapper.map(item, language, fallback, properties.apiBaseUrl(), exercise);
                exercise = exercises.saveAndFlush(exercise);
                exercise.getMedia().clear();
                exercises.flush();
                exercise.getMedia().addAll(mapper.media(item, properties.apiBaseUrl(), exercise));
                exercises.save(exercise);
                result[existing.isPresent() ? 1 : 0]++;
            } catch (RuntimeException ignored) {
                result[3]++;
            }
        }
        return result;
    }

    private int[] inspect(java.util.List<WgerExerciseInfo> source) {
        int[] result = new int[4];
        for (var item : source) {
            if (exercises.findBySourceAndExternalId(ExerciseSource.WGER, String.valueOf(item.id())).isPresent()) result[1]++;
            else result[0]++;
        }
        return result;
    }

    private String languageCode(String value) {
        return value == null ? "" : value.toLowerCase().split("[-_]")[0];
    }
    private String limit(String value) {
        if (value == null) return "Falha sem detalhes";
        return value.substring(0, Math.min(value.length(), 500));
    }
}
