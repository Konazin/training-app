package com.trainingapp.dto;

import com.trainingapp.model.SessionExerciseStatus;
import com.trainingapp.model.SessionStatus;
import com.trainingapp.model.ExerciseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record WorkoutSessionResponse(
        Long id,
        Long trainingPlanId,
        Long planDayId,
        String workoutName,
        LocalDate scheduledDate,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        OffsetDateTime pausedAt,
        SessionStatus status,
        int totalDurationSeconds,
        BigDecimal overallRpe,
        String notes,
        int completedSets,
        int totalPlannedSets,
        BigDecimal totalVolume,
        List<SessionExerciseResponse> exercises
) {
    public record SessionExerciseResponse(
            Long id,
            Long exerciseDefinitionId,
            String name,
            String muscleGroup,
            ExerciseCategory category,
            boolean timed,
            String primaryVideoUrl,
            String primaryImageUrl,
            String primaryVideoSourceUrl,
            String primaryVideoLicenseName,
            String primaryVideoLicenseUrl,
            String primaryVideoAuthor,
            String attribution,
            int sortOrder,
            int plannedSets,
            int plannedMinReps,
            int plannedMaxReps,
            int restSeconds,
            SessionExerciseStatus status,
            String notes,
            List<SetLogResponse> sets
    ) {}

    public record SetLogResponse(
            Long id,
            int setNumber,
            int reps,
            BigDecimal load,
            int durationSeconds,
            BigDecimal distance,
            BigDecimal rpe,
            boolean completed,
            OffsetDateTime completedAt,
            boolean manuallyAdded,
            String notes,
            BigDecimal volume
    ) {}
}
