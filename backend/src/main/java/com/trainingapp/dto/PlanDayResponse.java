package com.trainingapp.dto;

import com.trainingapp.model.SetType;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.List;

public record PlanDayResponse(
        Long id,
        DayOfWeek weekday,
        String title,
        String description,
        int sortOrder,
        boolean restDay,
        int estimatedDurationMinutes,
        String notes,
        List<DayExerciseResponse> exercises,
        List<RestActivityResponse> restActivities
) {
    public record DayExerciseResponse(
            Long id,
            ExerciseDefinitionResponse exercise,
            int sortOrder,
            int sets,
            int minReps,
            int maxReps,
            BigDecimal plannedLoad,
            Integer plannedDurationSeconds,
            BigDecimal plannedDistance,
            int restSeconds,
            BigDecimal plannedRpe,
            SetType setType,
            String notes,
            Long alternativeExerciseId
    ) {}

    public record RestActivityResponse(
            Long id,
            String name,
            String description,
            int estimatedDurationMinutes,
            String category,
            boolean optional,
            int sortOrder
    ) {}
}
