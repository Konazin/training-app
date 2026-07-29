package com.trainingapp.integration.wger.service;

import java.time.OffsetDateTime;

public record WgerSyncSummary(
        Long id, String status, boolean dryRun, OffsetDateTime startedAt, OffsetDateTime finishedAt,
        int pages, int created, int updated, int skipped, int failed, String message
) {
    static WgerSyncSummary from(WgerSyncRun run) {
        return new WgerSyncSummary(run.getId(), run.getStatus(), run.isDryRun(), run.getStartedAt(),
                run.getFinishedAt(), run.getPages(), run.getCreated(), run.getUpdated(), run.getSkipped(),
                run.getFailed(), run.getMessage());
    }
}
