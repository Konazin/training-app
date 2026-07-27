package com.trainingapp.umamusume.dto;

import com.trainingapp.umamusume.model.CareerStatus;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.util.List;

public record UmaCareerResponse(
        Long id,
        String name,
        CareerStatus status,
        int totalWeeks,
        int currentWeek,
        DayOfWeek currentWeekday,
        int strength,
        int endurance,
        int agility,
        int technique,
        int discipline,
        int energy,
        int fatigue,
        int mood,
        int confidence,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime completedAt,
        long version,
        double progressPercentage,
        TrainingPlanSummary trainingPlan,
        CurrentDaySummary currentDay,
        UmaTurnResponse pendingTurn,
        List<UmaTurnResponse> lastResults
) {
    public record TrainingPlanSummary(Long id, String name) {}

    public record CurrentDaySummary(
            Long id,
            DayOfWeek weekday,
            String title,
            boolean restDay,
            int exerciseCount,
            int estimatedDurationMinutes,
            List<RestActivitySummary> restActivities
    ) {}

    public record RestActivitySummary(
            Long id,
            String name,
            String category,
            int estimatedDurationMinutes
    ) {}
}
