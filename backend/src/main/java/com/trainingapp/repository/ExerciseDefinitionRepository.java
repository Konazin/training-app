package com.trainingapp.repository;

import com.trainingapp.model.ExerciseDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.trainingapp.model.ExerciseSource;

import java.util.List;
import java.util.Optional;

public interface ExerciseDefinitionRepository extends JpaRepository<ExerciseDefinition, Long>, JpaSpecificationExecutor<ExerciseDefinition> {
    Optional<ExerciseDefinition> findByNormalizedName(String normalizedName);
    Optional<ExerciseDefinition> findBySourceAndExternalId(ExerciseSource source, String externalId);
    List<ExerciseDefinition> findAllByOrderByNameAsc();
}
