package com.trainingapp.repository;

import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface ExerciseMediaRepository extends JpaRepository<ExerciseMedia, Long> {
    Optional<ExerciseMedia> findBySourceAndExternalId(ExerciseMediaSource source, String externalId);
    List<ExerciseMedia> findAllBySource(ExerciseMediaSource source);
}
