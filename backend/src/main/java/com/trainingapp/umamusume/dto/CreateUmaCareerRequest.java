package com.trainingapp.umamusume.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUmaCareerRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull Long trainingPlanId,
        @NotNull Integer totalWeeks
) {}
