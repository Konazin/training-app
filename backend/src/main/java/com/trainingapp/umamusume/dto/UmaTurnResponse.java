package com.trainingapp.umamusume.dto;

import com.trainingapp.umamusume.model.TurnActionType;
import com.trainingapp.umamusume.model.TurnStatus;
import com.trainingapp.umamusume.model.UmaEffects;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;

public record UmaTurnResponse(
        Long id,
        int weekNumber,
        DayOfWeek weekday,
        TurnActionType actionType,
        TurnStatus status,
        Long trainingPlanDayId,
        Long workoutSessionId,
        Long restActivityId,
        String actionTitle,
        String activityCategory,
        Integer activityDurationMinutes,
        String resultText,
        UmaEffects effects,
        OffsetDateTime createdAt,
        OffsetDateTime completedAt
) {}
