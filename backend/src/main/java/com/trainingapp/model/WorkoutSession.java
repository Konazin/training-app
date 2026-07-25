package com.trainingapp.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_plan_id")
    private TrainingPlan trainingPlan;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_day_id")
    private TrainingPlanDay planDay;
    @Column(nullable = false, length = 120)
    private String workoutNameSnapshot;
    @Column(nullable = false)
    private LocalDate scheduledDate;
    @Column(nullable = false)
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private OffsetDateTime pausedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private SessionStatus status = SessionStatus.IN_PROGRESS;
    @Column(nullable = false)
    private long pausedDurationSeconds;
    @Column(nullable = false)
    private int totalDurationSeconds;
    @Column(precision = 3, scale = 1)
    private BigDecimal overallRpe;
    @Column(length = 1000)
    private String notes = "";
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<WorkoutSessionExercise> exercises = new ArrayList<>();

    public Long getId() { return id; }
    public TrainingPlan getTrainingPlan() { return trainingPlan; }
    public void setTrainingPlan(TrainingPlan value) { trainingPlan = value; }
    public TrainingPlanDay getPlanDay() { return planDay; }
    public void setPlanDay(TrainingPlanDay value) { planDay = value; }
    public String getWorkoutNameSnapshot() { return workoutNameSnapshot; }
    public void setWorkoutNameSnapshot(String value) { workoutNameSnapshot = value; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate value) { scheduledDate = value; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime value) { startedAt = value; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime value) { completedAt = value; }
    public OffsetDateTime getPausedAt() { return pausedAt; }
    public void setPausedAt(OffsetDateTime value) { pausedAt = value; }
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus value) { status = value; }
    public long getPausedDurationSeconds() { return pausedDurationSeconds; }
    public void setPausedDurationSeconds(long value) { pausedDurationSeconds = value; }
    public int getTotalDurationSeconds() { return totalDurationSeconds; }
    public void setTotalDurationSeconds(int value) { totalDurationSeconds = value; }
    public BigDecimal getOverallRpe() { return overallRpe; }
    public void setOverallRpe(BigDecimal value) { overallRpe = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public List<WorkoutSessionExercise> getExercises() { return exercises; }
}
