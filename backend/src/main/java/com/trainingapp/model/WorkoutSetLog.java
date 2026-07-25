package com.trainingapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "workout_set_logs")
public class WorkoutSetLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_exercise_id", nullable = false)
    private WorkoutSessionExercise sessionExercise;
    @Column(nullable = false)
    private int setNumber;
    @Column(nullable = false)
    private int reps;
    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal load = BigDecimal.ZERO;
    @Column(nullable = false)
    private int durationSeconds;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal distance = BigDecimal.ZERO;
    @Column(precision = 3, scale = 1)
    private BigDecimal rpe;
    @Column(nullable = false)
    private boolean completed;
    private OffsetDateTime completedAt;
    private Boolean manuallyAdded = false;
    @Column(length = 500)
    private String notes = "";

    public Long getId() { return id; }
    public WorkoutSessionExercise getSessionExercise() { return sessionExercise; }
    public void setSessionExercise(WorkoutSessionExercise value) { sessionExercise = value; }
    public int getSetNumber() { return setNumber; }
    public void setSetNumber(int value) { setNumber = value; }
    public int getReps() { return reps; }
    public void setReps(int value) { reps = value; }
    public BigDecimal getLoad() { return load; }
    public void setLoad(BigDecimal value) { load = value; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int value) { durationSeconds = value; }
    public BigDecimal getDistance() { return distance; }
    public void setDistance(BigDecimal value) { distance = value; }
    public BigDecimal getRpe() { return rpe; }
    public void setRpe(BigDecimal value) { rpe = value; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean value) { completed = value; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime value) { completedAt = value; }
    public boolean isManuallyAdded() { return Boolean.TRUE.equals(manuallyAdded); }
    public void setManuallyAdded(boolean value) { manuallyAdded = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
}
