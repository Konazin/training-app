package com.trainingapp.integration.wger.service;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerSyncRequest;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaSource;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.ExerciseMediaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class WgerExerciseSyncService {
    private final WgerExerciseClient client;
    private final WgerExerciseMapper mapper;
    private final WgerProperties properties;
    private final ExerciseDefinitionRepository exercises;
    private final ExerciseMediaRepository media;
    private final WgerSyncRunRepository runs;
    private final TransactionTemplate transactions;
    private final AtomicBoolean running = new AtomicBoolean();

    public WgerExerciseSyncService(
            WgerExerciseClient client,
            WgerExerciseMapper mapper,
            WgerProperties properties,
            ExerciseDefinitionRepository exercises,
            ExerciseMediaRepository media,
            WgerSyncRunRepository runs,
            PlatformTransactionManager transactionManager
    ) {
        this.client = client;
        this.mapper = mapper;
        this.properties = properties;
        this.exercises = exercises;
        this.media = media;
        this.runs = runs;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public WgerSyncSummary sync(boolean dryRun) {
        return sync(new WgerSyncRequest(dryRun, null, false));
    }

    public WgerSyncSummary sync(WgerSyncRequest request) {
        if (!properties.integrationEnabled()) {
            throw new DomainConflictException("Integração Wger desabilitada");
        }
        if (!running.compareAndSet(false, true)) {
            throw new DomainConflictException("Sincronização Wger já está em execução");
        }

        WgerSyncRun run = new WgerSyncRun();
        run.setStatus("RUNNING");
        run.setDryRun(request.dryRun());
        run.setStartedAt(OffsetDateTime.now());
        run = runs.save(run);

        List<WgerSyncError> errors = new ArrayList<>();
        Set<String> seenMedia = new HashSet<>();
        boolean reachedLastPage = false;
        int maxPages = request.maxPages() == null ? properties.syncMaxPages() : request.maxPages();

        try {
            List<Integer> languagePriority = WgerLanguageResolver.resolve(
                    client.languages().results(),
                    properties.language(),
                    properties.fallbackLanguage()
            );
            int offset = 0;
            while (true) {
                var page = client.exercises(offset);
                BatchResult result = request.dryRun()
                        ? inspect(page.results(), request.onlyWithVideo())
                        : persist(page.results(), languagePriority, request.onlyWithVideo(), seenMedia);
                apply(run, result);
                addErrors(errors, result.errors());
                run.setPages(run.getPages() + 1);
                run.setErrorDetails(WgerSyncSummary.encode(errors));
                runs.save(run);

                if (page.next() == null) {
                    reachedLastPage = true;
                    break;
                }
                if (maxPages > 0 && run.getPages() >= maxPages) break;
                offset += Math.max(1, properties.pageSize());
            }

            if (!request.dryRun() && reachedLastPage && !request.onlyWithVideo() && run.getFailed() == 0) {
                transactions.executeWithoutResult(status -> removeStaleWgerMedia(seenMedia));
            }
            run.setStatus(run.getFailed() == 0 ? "COMPLETED" : "PARTIAL");
            run.setMessage(request.dryRun()
                    ? "Simulação concluída sem persistência"
                    : "Sincronização concluída");
        } catch (RuntimeException exception) {
            addErrors(errors, List.of(error(null, "page", exception)));
            run.setStatus(run.getPages() > 0 ? "PARTIAL" : "FAILED");
            run.setMessage(shortMessage(exception));
        } finally {
            run.setErrorDetails(WgerSyncSummary.encode(errors));
            run.setFinishedAt(OffsetDateTime.now());
            run = runs.save(run);
            running.set(false);
        }
        return WgerSyncSummary.from(run);
    }

    public WgerSyncSummary status() {
        return runs.findFirstByOrderByStartedAtDesc().map(WgerSyncSummary::from)
                .orElse(new WgerSyncSummary(
                        null, "NEVER_RUN", false, null, null,
                        0, 0, 0, 0, 0, null, List.of()
                ));
    }

    private BatchResult persist(
            List<WgerExerciseInfo> source,
            List<Integer> languagePriority,
            boolean onlyWithVideo,
            Set<String> seenMedia
    ) {
        BatchResult result = new BatchResult();
        for (WgerExerciseInfo item : safe(source)) {
            if (onlyWithVideo && !hasVideo(item)) {
                result.skipped++;
                continue;
            }
            try {
                ItemResult itemResult = transactions.execute(status ->
                        persistItem(item, languagePriority, seenMedia));
                if (itemResult != null && itemResult.created()) result.created++;
                else result.updated++;
            } catch (RuntimeException exception) {
                result.failed++;
                String stage = exception instanceof ItemSyncException itemException
                        ? itemException.stage() : "item";
                RuntimeException cause = exception instanceof ItemSyncException itemException
                        ? itemException.cause() : exception;
                result.errors.add(error(item.id(), stage, cause));
            }
        }
        return result;
    }

    private ItemResult persistItem(
            WgerExerciseInfo item,
            List<Integer> languagePriority,
            Set<String> seenMedia
    ) {
        var existing = exercises.findBySourceAndExternalId(ExerciseSource.WGER, String.valueOf(item.id()));
        ExerciseDefinition exercise = existing.orElseGet(ExerciseDefinition::new);
        OffsetDateTime now = OffsetDateTime.now();
        if (exercise.getCreatedAt() == null) exercise.setCreatedAt(now);
        exercise.setUpdatedAt(now);
        try {
            mapper.map(item, languagePriority, properties.apiBaseUrl(), exercise);
        } catch (RuntimeException exception) {
            throw new ItemSyncException("mapping", exception);
        }
        try {
            exercise = exercises.saveAndFlush(exercise);
        } catch (RuntimeException exception) {
            throw new ItemSyncException("exercise-persistence", exception);
        }
        try {
            upsertMedia(exercise, mapper.media(item, properties.apiBaseUrl(), exercise), seenMedia);
            exercises.save(exercise);
        } catch (RuntimeException exception) {
            throw new ItemSyncException("media-upsert", exception);
        }
        return new ItemResult(existing.isEmpty());
    }

    private void upsertMedia(
            ExerciseDefinition exercise,
            List<ExerciseMedia> desired,
            Set<String> seenMedia
    ) {
        Map<String, ExerciseMedia> existing = new HashMap<>();
        exercise.getMedia().stream()
                .filter(item -> item.getSource() == ExerciseMediaSource.WGER)
                .filter(item -> item.getExternalId() != null)
                .forEach(item -> existing.put(item.getExternalId(), item));

        for (ExerciseMedia incoming : desired) {
            String externalId = incoming.getExternalId();
            ExerciseMedia target = existing.get(externalId);
            if (target == null) {
                target = media.findBySourceAndExternalId(ExerciseMediaSource.WGER, externalId).orElse(null);
            }
            if (target == null) {
                target = incoming;
                target.setExerciseDefinition(exercise);
                exercise.getMedia().add(target);
            } else {
                target.setExerciseDefinition(exercise);
                if (!exercise.getMedia().contains(target)) exercise.getMedia().add(target);
                copyMutableMedia(incoming, target);
            }
            seenMedia.add(externalId);
        }
    }

    private void copyMutableMedia(ExerciseMedia source, ExerciseMedia target) {
        target.setType(source.getType());
        target.setUrl(source.getUrl());
        target.setThumbnailUrl(source.getThumbnailUrl());
        target.setMimeType(source.getMimeType());
        target.setWidth(source.getWidth());
        target.setHeight(source.getHeight());
        target.setDurationSeconds(source.getDurationSeconds());
        target.setMain(source.isMain());
        target.setSortOrder(source.getSortOrder());
        target.setLicenseName(source.getLicenseName());
        target.setLicenseUrl(source.getLicenseUrl());
        target.setAuthor(source.getAuthor());
        target.setSourceUrl(source.getSourceUrl());
        target.setUpdatedAt(OffsetDateTime.now());
    }

    private void removeStaleWgerMedia(Set<String> seenMedia) {
        List<ExerciseMedia> stale = media.findAllBySource(ExerciseMediaSource.WGER).stream()
                .filter(item -> !seenMedia.contains(item.getExternalId()))
                .toList();
        media.deleteAll(stale);
    }

    private BatchResult inspect(List<WgerExerciseInfo> source, boolean onlyWithVideo) {
        BatchResult result = new BatchResult();
        for (WgerExerciseInfo item : safe(source)) {
            if (onlyWithVideo && !hasVideo(item)) {
                result.skipped++;
            } else if (exercises.findBySourceAndExternalId(
                    ExerciseSource.WGER, String.valueOf(item.id())).isPresent()) {
                result.updated++;
            } else {
                result.created++;
            }
        }
        return result;
    }

    private boolean hasVideo(WgerExerciseInfo item) {
        return item.videos() != null && item.videos().stream()
                .anyMatch(video -> video != null && video.video() != null && !video.video().isBlank());
    }

    private void apply(WgerSyncRun run, BatchResult result) {
        run.setCreated(run.getCreated() + result.created);
        run.setUpdated(run.getUpdated() + result.updated);
        run.setSkipped(run.getSkipped() + result.skipped);
        run.setFailed(run.getFailed() + result.failed);
    }

    private void addErrors(List<WgerSyncError> target, List<WgerSyncError> added) {
        for (WgerSyncError error : added) {
            if (target.size() >= 10) return;
            target.add(error);
        }
    }

    private WgerSyncError error(Integer externalId, String stage, RuntimeException exception) {
        return new WgerSyncError(
                externalId == null ? null : String.valueOf(externalId),
                stage,
                shortMessage(exception)
        );
    }

    private String shortMessage(RuntimeException exception) {
        String value = exception.getMessage();
        if (value == null || value.isBlank()) value = exception.getClass().getSimpleName();
        value = value.replaceAll("[\\r\\n\\t\\p{Cntrl}]+", " ").trim();
        return value.substring(0, Math.min(value.length(), 300));
    }

    private List<WgerExerciseInfo> safe(List<WgerExerciseInfo> source) {
        return source == null ? List.of() : source;
    }

    private record ItemResult(boolean created) {}

    private static final class ItemSyncException extends RuntimeException {
        private final String stage;

        private ItemSyncException(String stage, RuntimeException cause) {
            super(cause);
            this.stage = stage;
        }

        private String stage() {
            return stage;
        }

        private RuntimeException cause() {
            return (RuntimeException) getCause();
        }
    }

    private static final class BatchResult {
        private int created;
        private int updated;
        private int skipped;
        private int failed;
        private final List<WgerSyncError> errors = new ArrayList<>();

        List<WgerSyncError> errors() {
            return errors;
        }
    }
}
