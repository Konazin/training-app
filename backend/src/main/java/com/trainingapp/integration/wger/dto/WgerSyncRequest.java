package com.trainingapp.integration.wger.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record WgerSyncRequest(
        boolean dryRun,
        @PositiveOrZero Integer maxPages,
        boolean onlyWithVideo
) {
    public static WgerSyncRequest defaults() {
        return new WgerSyncRequest(false, null, false);
    }
}
