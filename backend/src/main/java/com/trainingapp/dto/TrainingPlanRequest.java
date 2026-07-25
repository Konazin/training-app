package com.trainingapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TrainingPlanRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        @NotBlank @Size(max = 80) String category,
        @NotBlank @Size(max = 40) String difficulty,
        LocalDate startDate,
        LocalDate endDate
) {
    public TrainingPlanRequest(String name, String description, String category, String difficulty) {
        this(name, description, category, difficulty, null, null);
    }
}
