package com.trainingapp.dto;

import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.ExerciseSource;

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
        ExerciseSource source,
        String externalId,
        String sourceUrl,
        String licenseName,
        String licenseUrl,
        String author,
        List<ExerciseMediaResponse> media,
        ExerciseMediaResponse primaryVideo,
        ExerciseMediaResponse primaryImage,
        boolean hasVideo,
        String primaryVideoUrl,
        String primaryImageUrl,
        boolean unilateral,
        boolean timed,
        boolean custom,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
