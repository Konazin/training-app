package com.trainingapp.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record CompleteSessionRequest(
        @DecimalMin("1.0") @DecimalMax("10.0") BigDecimal overallRpe,
        String notes
) {}
