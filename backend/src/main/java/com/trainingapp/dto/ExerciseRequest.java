package com.trainingapp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

public record ExerciseRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 80) String muscleGroup,
        @NotNull @Min(1) Integer sets,
        @NotNull @Min(1) Integer reps,
        @NotNull @DecimalMin("0.0") BigDecimal weightKg,
        @NotNull @Min(0) Integer restSeconds,
        Map<String, Object> customStats
) {
}
