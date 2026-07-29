package com.trainingapp.repository;

import com.trainingapp.model.WorkoutSessionLock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface WorkoutSessionLockRepository extends JpaRepository<WorkoutSessionLock, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select lock from WorkoutSessionLock lock where lock.id = 1")
    WorkoutSessionLock lock();
}
