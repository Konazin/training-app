package com.trainingapp.dto;

import com.trainingapp.model.ExerciseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ExerciseDefinitionRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 600) String description,
        @NotBlank @Size(max = 80) String primaryMuscleGroup,
        List<@Size(max = 80) String> secondaryMuscleGroups,
        @NotBlank @Size(max = 80) String equipment,
        @NotNull ExerciseCategory category,
        @NotBlank @Size(max = 40) String difficulty,
        @Size(max = 1500) String instructions,
        @Size(max = 600) String notes,
        @Size(max = 500) String mediaUrl,
        boolean unilateral,
        boolean timed
) {}
