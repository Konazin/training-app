package com.trainingapp.integration.wger.service;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.config.WgerProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Component
public class WgerSyncLockManager {
    private static final int LOCK_ID = 1;
    private final WgerSyncLockRepository repository;
    private final WgerProperties properties;

    public WgerSyncLockManager(WgerSyncLockRepository repository, WgerProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional
    public void acquire(String owner) {
        WgerSyncLock lock = requireLock();
        OffsetDateTime expiresBefore = OffsetDateTime.now()
                .minusMinutes(Math.max(1, properties.syncLockTimeoutMinutes()));
        if (lock.getOwner() != null
                && lock.getStartedAt() != null
                && lock.getStartedAt().isAfter(expiresBefore)) {
            throw new DomainConflictException("Sincronização Wger já está em execução");
        }
        lock.setOwner(owner);
        lock.setStartedAt(OffsetDateTime.now());
    }

    @Transactional
    public void release(String owner) {
        WgerSyncLock lock = requireLock();
        if (owner.equals(lock.getOwner())) clear(lock);
    }

    @Transactional
    public boolean recoverExpired() {
        WgerSyncLock lock = requireLock();
        OffsetDateTime expiresBefore = OffsetDateTime.now()
                .minusMinutes(Math.max(1, properties.syncLockTimeoutMinutes()));
        if (lock.getOwner() != null
                && (lock.getStartedAt() == null || !lock.getStartedAt().isAfter(expiresBefore))) {
            clear(lock);
            return true;
        }
        return false;
    }

    private WgerSyncLock requireLock() {
        return repository.lockById(LOCK_ID)
                .orElseThrow(() -> new IllegalStateException("Controle de sincronização Wger não inicializado"));
    }

    private void clear(WgerSyncLock lock) {
        lock.setOwner(null);
        lock.setStartedAt(null);
    }
}
