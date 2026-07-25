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

@Entity
@Table(name = "rest_day_activities")
public class RestDayActivity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_day_id", nullable = false)
    private TrainingPlanDay planDay;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 500)
    private String description = "";
    @Column(nullable = false)
    private int estimatedDurationMinutes;
    @Column(nullable = false, length = 80)
    private String category;
    @Column(nullable = false)
    private boolean optional = true;
    @Column(nullable = false)
    private int sortOrder;

    public Long getId() { return id; }
    public TrainingPlanDay getPlanDay() { return planDay; }
    public void setPlanDay(TrainingPlanDay value) { planDay = value; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public int getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(int value) { estimatedDurationMinutes = value; }
    public String getCategory() { return category; }
    public void setCategory(String value) { category = value; }
    public boolean isOptional() { return optional; }
    public void setOptional(boolean value) { optional = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
}
