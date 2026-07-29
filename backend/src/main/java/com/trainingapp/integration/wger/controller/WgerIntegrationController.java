package com.trainingapp.integration.wger.controller;

import com.trainingapp.integration.wger.service.WgerExerciseSyncService;
import com.trainingapp.integration.wger.service.WgerSyncSummary;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/wger")
public class WgerIntegrationController {
    private final WgerExerciseSyncService service;

    public WgerIntegrationController(WgerExerciseSyncService service) { this.service = service; }

    @PostMapping("/sync")
    public WgerSyncSummary sync(@RequestParam(defaultValue = "false") boolean dryRun) {
        return service.sync(dryRun);
    }

    @GetMapping("/status")
    public WgerSyncSummary status() { return service.status(); }
}
