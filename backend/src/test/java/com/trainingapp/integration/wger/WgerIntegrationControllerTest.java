package com.trainingapp.integration.wger;

import com.trainingapp.integration.wger.controller.WgerIntegrationController;
import com.trainingapp.integration.wger.dto.WgerSyncRequest;
import com.trainingapp.integration.wger.service.WgerExerciseSyncService;
import com.trainingapp.integration.wger.service.WgerSyncSummary;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WgerIntegrationControllerTest {

    @Test
    void acceptsJsonRequestAsPrimaryContract() throws Exception {
        WgerExerciseSyncService service = mock(WgerExerciseSyncService.class);
        when(service.sync(any(WgerSyncRequest.class))).thenReturn(summary("COMPLETED", 1));
        var mvc = MockMvcBuilders.standaloneSetup(new WgerIntegrationController(service)).build();

        mvc.perform(post("/api/integrations/wger/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dryRun":true,"maxPages":2,"onlyWithVideo":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        verify(service).sync(new WgerSyncRequest(true, 2, true));
    }

    @Test
    void legacyDryRunQueryRemainsCompatibleAndUnavailableFirstPageReturns503() throws Exception {
        WgerExerciseSyncService service = mock(WgerExerciseSyncService.class);
        when(service.sync(any(WgerSyncRequest.class))).thenReturn(summary("FAILED", 0));
        var mvc = MockMvcBuilders.standaloneSetup(new WgerIntegrationController(service)).build();

        mvc.perform(post("/api/integrations/wger/sync").queryParam("dryRun", "true"))
                .andExpect(status().isServiceUnavailable());

        verify(service).sync(new WgerSyncRequest(true, null, false));
    }

    private WgerSyncSummary summary(String status, int pages) {
        return new WgerSyncSummary(
                1L, status, false, null, null, pages,
                0, 0, 0, 0, null, List.of()
        );
    }
}
