package com.trainingapp.dto;

import com.trainingapp.model.WorkoutStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record WorkoutResponse(
        Long id,
        String name,
        String description,
        LocalDate scheduledDate,
        WorkoutStatus status,
        Integer durationMinutes,
        Integer calories,
        Map<String, Object> customStats,
        List<ExerciseResponse> exercises,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
