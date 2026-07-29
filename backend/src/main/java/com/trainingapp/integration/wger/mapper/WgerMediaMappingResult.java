package com.trainingapp.integration.wger.mapper;

import com.trainingapp.model.ExerciseMedia;

import java.util.List;

public record WgerMediaMappingResult(List<ExerciseMedia> media, List<String> errors) {}
