package com.trainingapp.integration.wger.service;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WgerSyncRunRepository extends JpaRepository<WgerSyncRun, Long> {
    Optional<WgerSyncRun> findFirstByOrderByStartedAtDesc();
}
