package com.trainingapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record PlanDayRequest(
        @Size(max = 120) String title,
        @Size(max = 500) String description,
        boolean restDay,
        @Min(0) int estimatedDurationMinutes,
        @Size(max = 600) String notes
) {}
