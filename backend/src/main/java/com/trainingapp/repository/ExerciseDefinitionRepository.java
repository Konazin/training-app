package com.trainingapp.repository;

import com.trainingapp.model.ExerciseDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExerciseDefinitionRepository extends JpaRepository<ExerciseDefinition, Long> {
    Optional<ExerciseDefinition> findByNormalizedName(String normalizedName);
    List<ExerciseDefinition> findAllByOrderByNameAsc();
}
