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

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_session_exercises")
public class WorkoutSessionExercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WorkoutSession session;
    private Long exerciseDefinitionId;
    @Column(nullable = false, length = 120)
    private String exerciseNameSnapshot;
    @Column(nullable = false, length = 80)
    private String muscleGroupSnapshot;
    @Column(nullable = false)
    private int sortOrder;
    @Column(nullable = false)
    private int plannedSets;
    @Column(nullable = false)
    private int plannedMinReps;
    @Column(nullable = false)
    private int plannedMaxReps;
    @Column(nullable = false)
    private int restSeconds;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private SessionExerciseStatus status = SessionExerciseStatus.PENDING;
    @Column(length = 600)
    private String notes = "";
    @OneToMany(mappedBy = "sessionExercise", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("setNumber ASC")
    private List<WorkoutSetLog> sets = new ArrayList<>();

    public Long getId() { return id; }
    public WorkoutSession getSession() { return session; }
    public void setSession(WorkoutSession value) { session = value; }
    public Long getExerciseDefinitionId() { return exerciseDefinitionId; }
    public void setExerciseDefinitionId(Long value) { exerciseDefinitionId = value; }
    public String getExerciseNameSnapshot() { return exerciseNameSnapshot; }
    public void setExerciseNameSnapshot(String value) { exerciseNameSnapshot = value; }
    public String getMuscleGroupSnapshot() { return muscleGroupSnapshot; }
    public void setMuscleGroupSnapshot(String value) { muscleGroupSnapshot = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public int getPlannedSets() { return plannedSets; }
    public void setPlannedSets(int value) { plannedSets = value; }
    public int getPlannedMinReps() { return plannedMinReps; }
    public void setPlannedMinReps(int value) { plannedMinReps = value; }
    public int getPlannedMaxReps() { return plannedMaxReps; }
    public void setPlannedMaxReps(int value) { plannedMaxReps = value; }
    public int getRestSeconds() { return restSeconds; }
    public void setRestSeconds(int value) { restSeconds = value; }
    public SessionExerciseStatus getStatus() { return status; }
    public void setStatus(SessionExerciseStatus value) { status = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public List<WorkoutSetLog> getSets() { return sets; }
}
