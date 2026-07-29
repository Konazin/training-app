package com.trainingapp.integration.wger.service;

import java.time.OffsetDateTime;
import java.util.List;

public record WgerSyncSummary(
        Long id, String status, boolean dryRun, OffsetDateTime startedAt, OffsetDateTime finishedAt,
        int pages, int created, int updated, int skipped, int failed, String message,
        List<WgerSyncError> errors
) {
    static WgerSyncSummary from(WgerSyncRun run) {
        return new WgerSyncSummary(run.getId(), run.getStatus(), run.isDryRun(), run.getStartedAt(),
                run.getFinishedAt(), run.getPages(), run.getCreated(), run.getUpdated(), run.getSkipped(),
                run.getFailed(), run.getMessage(), decode(run.getErrorDetails()));
    }

    static String encode(List<WgerSyncError> errors) {
        return errors.stream().limit(10)
                .map(error -> clean(error.externalId()) + "\t" + clean(error.stage()) + "\t" + clean(error.message()))
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private static List<WgerSyncError> decode(String encoded) {
        if (encoded == null || encoded.isBlank()) return List.of();
        return encoded.lines().limit(10).map(line -> {
            String[] parts = line.split("\t", 3);
            return new WgerSyncError(
                    parts.length > 0 ? parts[0] : "",
                    parts.length > 1 ? parts[1] : "",
                    parts.length > 2 ? parts[2] : ""
            );
        }).toList();
    }

    private static String clean(String value) {
        if (value == null) return "";
        String sanitized = value.replaceAll("[\\r\\n\\t\\p{Cntrl}]+", " ").trim();
        return sanitized.substring(0, Math.min(sanitized.length(), 300));
    }
}
