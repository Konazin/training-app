package com.trainingapp.dto;

import com.trainingapp.model.WorkoutStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.Map;

public record WorkoutRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        @NotNull LocalDate scheduledDate,
        @NotNull WorkoutStatus status,
        @NotNull @Min(0) Integer durationMinutes,
        @NotNull @Min(0) Integer calories,
        Map<String, Object> customStats
) {
}
