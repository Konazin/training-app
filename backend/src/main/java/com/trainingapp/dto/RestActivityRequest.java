package com.trainingapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RestActivityRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        @Min(0) int estimatedDurationMinutes,
        @NotBlank @Size(max = 80) String category,
        boolean optional
) {}
