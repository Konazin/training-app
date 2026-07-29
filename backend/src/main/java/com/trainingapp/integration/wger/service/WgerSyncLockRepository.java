package com.trainingapp.integration.wger.service;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WgerSyncLockRepository extends JpaRepository<WgerSyncLock, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select lock from WgerSyncLock lock where lock.id = :id")
    Optional<WgerSyncLock> lockById(@Param("id") Integer id);
}
