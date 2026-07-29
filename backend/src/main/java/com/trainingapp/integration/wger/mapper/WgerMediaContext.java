package com.trainingapp.integration.wger.mapper;

public record WgerMediaContext(
        String publicExerciseUrl,
        String exerciseSourceUrl,
        String licenseName,
        String licenseUrl,
        String author
) {}
