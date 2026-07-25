package com.trainingapp.dto;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.List;

public record TrainingPlanResponse(
        Long id,
        String name,
        String description,
        String category,
        String difficulty,
        boolean active,
        boolean archived,
        LocalDate startDate,
        LocalDate endDate,
        List<PlanExerciseResponse> exercises,
        List<PlanDayResponse> days,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
