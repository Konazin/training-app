package com.trainingapp.repository;

import com.trainingapp.model.Workout;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {

    @Override
    @EntityGraph(attributePaths = "exercises")
    Optional<Workout> findById(Long id);

    @EntityGraph(attributePaths = "exercises")
    List<Workout> findAllByOrderByScheduledDateDesc();
}
