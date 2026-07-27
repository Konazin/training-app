package com.trainingapp.umamusume.model;

import com.trainingapp.model.TrainingPlanDay;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "uma_career_turns",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_uma_career_turn",
                columnNames = {"career_id", "week_number", "weekday"}))
public class UmaCareerTurn {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "career_id", nullable = false)
    private UmaCareer career;
    @Column(nullable = false)
    private int weekNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private DayOfWeek weekday;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private TurnActionType actionType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private TurnStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_plan_day_id")
    private TrainingPlanDay trainingPlanDay;
    @Column(unique = true)
    private Long workoutSessionId;
    private Long restActivityId;
    @Column(nullable = false, length = 120)
    private String actionTitleSnapshot;
    @Column(length = 80)
    private String activityCategorySnapshot;
    private Integer activityDurationMinutesSnapshot;
    @Column(nullable = false, length = 1000)
    private String resultText = "";
    @Embedded
    private UmaEffects effects = new UmaEffects();
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    private OffsetDateTime completedAt;

    public Long getId() { return id; }
    public UmaCareer getCareer() { return career; }
    public void setCareer(UmaCareer value) { career = value; }
    public int getWeekNumber() { return weekNumber; }
    public void setWeekNumber(int value) { weekNumber = value; }
    public DayOfWeek getWeekday() { return weekday; }
    public void setWeekday(DayOfWeek value) { weekday = value; }
    public TurnActionType getActionType() { return actionType; }
    public void setActionType(TurnActionType value) { actionType = value; }
    public TurnStatus getStatus() { return status; }
    public void setStatus(TurnStatus value) { status = value; }
    public TrainingPlanDay getTrainingPlanDay() { return trainingPlanDay; }
    public void setTrainingPlanDay(TrainingPlanDay value) { trainingPlanDay = value; }
    public Long getWorkoutSessionId() { return workoutSessionId; }
    public void setWorkoutSessionId(Long value) { workoutSessionId = value; }
    public Long getRestActivityId() { return restActivityId; }
    public void setRestActivityId(Long value) { restActivityId = value; }
    public String getActionTitleSnapshot() { return actionTitleSnapshot; }
    public void setActionTitleSnapshot(String value) { actionTitleSnapshot = value; }
    public String getActivityCategorySnapshot() { return activityCategorySnapshot; }
    public void setActivityCategorySnapshot(String value) { activityCategorySnapshot = value; }
    public Integer getActivityDurationMinutesSnapshot() { return activityDurationMinutesSnapshot; }
    public void setActivityDurationMinutesSnapshot(Integer value) { activityDurationMinutesSnapshot = value; }
    public String getResultText() { return resultText; }
    public void setResultText(String value) { resultText = value; }
    public UmaEffects getEffects() { return effects; }
    public void setEffects(UmaEffects value) { effects = value; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime value) { createdAt = value; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime value) { completedAt = value; }
}
