package com.trainingapp.integration.wger.service;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface WgerSyncRunRepository extends JpaRepository<WgerSyncRun, Long> {
    Optional<WgerSyncRun> findFirstByOrderByStartedAtDesc();
    List<WgerSyncRun> findAllByStatus(String status);
}
