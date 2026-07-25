package com.trainingapp.dto;

import java.util.List;

public record DashboardResponse(
        long totalWorkouts,
        long completedWorkouts,
        long totalExercises,
        long totalMinutes,
        long totalCalories,
        List<WorkoutResponse> recentWorkouts,
        String activePlanName,
        String nextWorkoutName,
        Long nextPlanDayId,
        long completedSessions,
        long weeklySessions,
        java.math.BigDecimal totalVolume,
        int adherence
) {
}
