package com.trainingapp.dto;

import com.trainingapp.model.SetType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DayExerciseRequest(
        @NotNull Long exerciseDefinitionId,
        @Min(1) int sets,
        @Min(0) int minReps,
        @Min(0) int maxReps,
        @DecimalMin("0.0") BigDecimal plannedLoad,
        @Min(0) Integer plannedDurationSeconds,
        @DecimalMin("0.0") BigDecimal plannedDistance,
        @Min(0) int restSeconds,
        @DecimalMin("1.0") @DecimalMax("10.0") BigDecimal plannedRpe,
        SetType setType,
        @Size(max = 600) String notes,
        Long alternativeExerciseId
) {}
