package com.trainingapp.integration.wger.controller;

import com.trainingapp.integration.wger.dto.WgerSyncRequest;
import com.trainingapp.integration.wger.service.WgerExerciseSyncService;
import com.trainingapp.integration.wger.service.WgerSyncSummary;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/wger")
public class WgerIntegrationController {
    private final WgerExerciseSyncService service;

    public WgerIntegrationController(WgerExerciseSyncService service) { this.service = service; }

    @PostMapping("/sync")
    public ResponseEntity<WgerSyncSummary> sync(
            @Valid @RequestBody(required = false) WgerSyncRequest body,
            @RequestParam(required = false) Boolean dryRun
    ) {
        WgerSyncRequest request = body == null
                ? new WgerSyncRequest(Boolean.TRUE.equals(dryRun), null, false)
                : body;
        WgerSyncSummary summary = service.sync(request);
        HttpStatus status = summary.pages() == 0 && "FAILED".equals(summary.status())
                ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
        return ResponseEntity.status(status).body(summary);
    }

    @GetMapping("/status")
    public WgerSyncSummary status() { return service.status(); }
}
