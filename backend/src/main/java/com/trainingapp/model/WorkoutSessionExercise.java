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
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ExerciseCategory categorySnapshot;
    private Boolean timedSnapshot = false;
    @Column(length = 1000)
    private String primaryVideoUrl;
    @Column(length = 1000)
    private String primaryVideoSourceUrl;
    @Column(length = 200)
    private String primaryVideoLicenseName;
    @Column(length = 1000)
    private String primaryVideoLicenseUrl;
    @Column(length = 500)
    private String primaryVideoAuthor;
    @Column(length = 1000)
    private String primaryImageUrl;
    @Column(length = 1000)
    private String attribution;
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
    public ExerciseCategory getCategorySnapshot() { return categorySnapshot; }
    public void setCategorySnapshot(ExerciseCategory value) { categorySnapshot = value; }
    public boolean isTimedSnapshot() { return Boolean.TRUE.equals(timedSnapshot); }
    public void setTimedSnapshot(boolean value) { timedSnapshot = value; }
    public String getPrimaryVideoUrl() { return primaryVideoUrl; }
    public void setPrimaryVideoUrl(String value) { primaryVideoUrl = value; }
    public String getPrimaryVideoSourceUrl() { return primaryVideoSourceUrl; }
    public void setPrimaryVideoSourceUrl(String value) { primaryVideoSourceUrl = value; }
    public String getPrimaryVideoLicenseName() { return primaryVideoLicenseName; }
    public void setPrimaryVideoLicenseName(String value) { primaryVideoLicenseName = value; }
    public String getPrimaryVideoLicenseUrl() { return primaryVideoLicenseUrl; }
    public void setPrimaryVideoLicenseUrl(String value) { primaryVideoLicenseUrl = value; }
    public String getPrimaryVideoAuthor() { return primaryVideoAuthor; }
    public void setPrimaryVideoAuthor(String value) { primaryVideoAuthor = value; }
    public String getPrimaryImageUrl() { return primaryImageUrl; }
    public void setPrimaryImageUrl(String value) { primaryImageUrl = value; }
    public String getAttribution() { return attribution; }
    public void setAttribution(String value) { attribution = value; }
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
