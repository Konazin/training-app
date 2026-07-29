package com.trainingapp.dto;

import com.trainingapp.model.ExerciseMediaSource;
import com.trainingapp.model.ExerciseMediaType;

public record ExerciseMediaResponse(
        Long id, ExerciseMediaType type, ExerciseMediaSource source, String url, String thumbnailUrl,
        String mimeType, Integer width, Integer height, Integer durationSeconds, boolean main,
        String licenseName, String licenseUrl, String author, String sourceUrl
) {}
