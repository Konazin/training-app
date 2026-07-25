package com.trainingapp.dto;

import com.trainingapp.model.ExerciseCategory;

import java.time.OffsetDateTime;
import java.util.List;

public record ExerciseDefinitionResponse(
        Long id,
        String name,
        String description,
        String primaryMuscleGroup,
        List<String> secondaryMuscleGroups,
        String equipment,
        ExerciseCategory category,
        String difficulty,
        String instructions,
        String notes,
        String mediaUrl,
        boolean unilateral,
        boolean timed,
        boolean custom,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
