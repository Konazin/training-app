package com.trainingapp.model;

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
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "training_day_exercises")
public class TrainingDayExercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_day_id", nullable = false)
    private TrainingPlanDay planDay;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_definition_id", nullable = false)
    private ExerciseDefinition exercise;
    @Column(nullable = false)
    private int sortOrder;
    @Column(nullable = false)
    private int sets;
    @Column(nullable = false)
    private int minReps;
    @Column(nullable = false)
    private int maxReps;
    @Column(precision = 8, scale = 2)
    private BigDecimal plannedLoad;
    private Integer plannedDurationSeconds;
    @Column(precision = 10, scale = 2)
    private BigDecimal plannedDistance;
    @Column(nullable = false)
    private int restSeconds;
    @Column(precision = 3, scale = 1)
    private BigDecimal plannedRpe;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private SetType setType = SetType.NORMAL;
    @Column(length = 600)
    private String notes = "";
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alternative_exercise_id")
    private ExerciseDefinition alternativeExercise;

    public Long getId() { return id; }
    public TrainingPlanDay getPlanDay() { return planDay; }
    public void setPlanDay(TrainingPlanDay value) { planDay = value; }
    public ExerciseDefinition getExercise() { return exercise; }
    public void setExercise(ExerciseDefinition value) { exercise = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public int getSets() { return sets; }
    public void setSets(int value) { sets = value; }
    public int getMinReps() { return minReps; }
    public void setMinReps(int value) { minReps = value; }
    public int getMaxReps() { return maxReps; }
    public void setMaxReps(int value) { maxReps = value; }
    public BigDecimal getPlannedLoad() { return plannedLoad; }
    public void setPlannedLoad(BigDecimal value) { plannedLoad = value; }
    public Integer getPlannedDurationSeconds() { return plannedDurationSeconds; }
    public void setPlannedDurationSeconds(Integer value) { plannedDurationSeconds = value; }
    public BigDecimal getPlannedDistance() { return plannedDistance; }
    public void setPlannedDistance(BigDecimal value) { plannedDistance = value; }
    public int getRestSeconds() { return restSeconds; }
    public void setRestSeconds(int value) { restSeconds = value; }
    public BigDecimal getPlannedRpe() { return plannedRpe; }
    public void setPlannedRpe(BigDecimal value) { plannedRpe = value; }
    public SetType getSetType() { return setType; }
    public void setSetType(SetType value) { setType = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public ExerciseDefinition getAlternativeExercise() { return alternativeExercise; }
    public void setAlternativeExercise(ExerciseDefinition value) { alternativeExercise = value; }
}
