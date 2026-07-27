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
import jakarta.persistence.UniqueConstraint;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "training_plan_days",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_training_plan_weekday",
                columnNames = {"training_plan_id", "weekday"}))
public class TrainingPlanDay {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "training_plan_id", nullable = false)
    private TrainingPlan trainingPlan;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private DayOfWeek weekday;
    @Column(length = 120)
    private String title = "";
    @Column(length = 500)
    private String description = "";
    @Column(nullable = false)
    private int sortOrder;
    @Column(nullable = false)
    private boolean restDay;
    @Column(nullable = false)
    private int estimatedDurationMinutes;
    @Column(length = 600)
    private String notes = "";
    @OneToMany(mappedBy = "planDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<TrainingDayExercise> exercises = new ArrayList<>();
    @OneToMany(mappedBy = "planDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<RestDayActivity> restActivities = new ArrayList<>();

    public Long getId() { return id; }
    public TrainingPlan getTrainingPlan() { return trainingPlan; }
    public void setTrainingPlan(TrainingPlan value) { trainingPlan = value; }
    public DayOfWeek getWeekday() { return weekday; }
    public void setWeekday(DayOfWeek value) { weekday = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public boolean isRestDay() { return restDay; }
    public void setRestDay(boolean value) { restDay = value; }
    public int getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(int value) { estimatedDurationMinutes = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public List<TrainingDayExercise> getExercises() { return exercises; }
    public List<RestDayActivity> getRestActivities() { return restActivities; }
}
