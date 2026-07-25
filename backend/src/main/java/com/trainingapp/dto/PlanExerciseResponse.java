package com.trainingapp.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

public record PlanExerciseResponse(
        Long id,
        String name,
        String muscleGroup,
        Integer sets,
        Integer reps,
        BigDecimal weightKg,
        Integer restSeconds,
        Map<String, Object> customStats,
        OffsetDateTime createdAt
) {
}
