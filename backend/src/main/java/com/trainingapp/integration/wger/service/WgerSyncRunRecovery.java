package com.trainingapp.integration.wger.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
public class WgerSyncRunRecovery implements ApplicationRunner {
    private final WgerSyncRunRepository repository;

    public WgerSyncRunRecovery(WgerSyncRunRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        var interrupted = repository.findAllByStatus("RUNNING");
        interrupted.forEach(run -> {
            run.setStatus("INTERRUPTED");
            run.setFinishedAt(OffsetDateTime.now());
            run.setMessage("Execução interrompida pela reinicialização do backend");
        });
        if (!interrupted.isEmpty()) repository.saveAll(interrupted);
    }
}
