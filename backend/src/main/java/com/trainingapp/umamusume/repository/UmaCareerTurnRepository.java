package com.trainingapp.umamusume.repository;

import com.trainingapp.umamusume.model.UmaCareerTurn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface UmaCareerTurnRepository extends JpaRepository<UmaCareerTurn, Long> {
    List<UmaCareerTurn> findByCareerIdOrderByCreatedAtDesc(Long careerId);
    Optional<UmaCareerTurn> findByCareerIdAndWeekNumberAndWeekday(
            Long careerId,
            int weekNumber,
            DayOfWeek weekday
    );
    Optional<UmaCareerTurn> findByWorkoutSessionId(Long workoutSessionId);
}
