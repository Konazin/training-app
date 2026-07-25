package com.trainingapp.repository;

import com.trainingapp.model.SessionStatus;
import com.trainingapp.model.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {
    @Override
    Optional<WorkoutSession> findById(Long id);

    List<WorkoutSession> findAllByOrderByStartedAtDesc();

    Optional<WorkoutSession> findFirstByStatusInOrderByStartedAtDesc(List<SessionStatus> statuses);

    boolean existsByStatusIn(List<SessionStatus> statuses);
}
