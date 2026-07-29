package com.trainingapp.integration.wger.service;

import com.trainingapp.integration.wger.config.WgerProperties;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
public class WgerSyncRunRecovery implements ApplicationRunner {
    private final WgerSyncRunRepository repository;
    private final WgerSyncLockManager lockManager;
    private final WgerProperties properties;

    public WgerSyncRunRecovery(
            WgerSyncRunRepository repository,
            WgerSyncLockManager lockManager,
            WgerProperties properties
    ) {
        this.repository = repository;
        this.lockManager = lockManager;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        OffsetDateTime expiresBefore = OffsetDateTime.now()
                .minusMinutes(Math.max(1, properties.syncLockTimeoutMinutes()));
        var interrupted = repository.findAllByStatus("RUNNING").stream()
                .filter(run -> run.getStartedAt().isBefore(expiresBefore))
                .toList();
        interrupted.forEach(run -> {
            run.setStatus("INTERRUPTED");
            run.setFinishedAt(OffsetDateTime.now());
            run.setMessage("Execução interrompida pela reinicialização do backend");
        });
        if (!interrupted.isEmpty()) repository.saveAll(interrupted);
        lockManager.recoverExpired();
    }
}
