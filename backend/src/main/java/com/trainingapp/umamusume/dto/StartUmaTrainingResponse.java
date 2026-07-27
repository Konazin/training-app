package com.trainingapp.umamusume.dto;

import com.trainingapp.dto.WorkoutSessionResponse;

public record StartUmaTrainingResponse(
        UmaCareerResponse career,
        WorkoutSessionResponse session
) {}
