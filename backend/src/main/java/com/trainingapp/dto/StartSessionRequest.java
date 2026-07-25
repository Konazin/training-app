package com.trainingapp.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record StartSessionRequest(
        @NotNull Long trainingPlanId,
        @NotNull Long planDayId,
        LocalDate scheduledDate
) {}
