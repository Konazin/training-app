package com.trainingapp.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record SetLogRequest(
        @Min(0) int reps,
        @DecimalMin("0.0") BigDecimal load,
        @Min(0) int durationSeconds,
        @DecimalMin("0.0") BigDecimal distance,
        @DecimalMin("1.0") @DecimalMax("10.0") BigDecimal rpe,
        boolean completed,
        String notes
) {}
