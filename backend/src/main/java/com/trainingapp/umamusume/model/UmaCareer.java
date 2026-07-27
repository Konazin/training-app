package com.trainingapp.umamusume.model;

import com.trainingapp.model.TrainingPlan;
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
import jakarta.persistence.Version;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;

@Entity
@Table(name = "uma_careers")
public class UmaCareer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String name;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "training_plan_id", nullable = false)
    private TrainingPlan trainingPlan;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private CareerStatus status = CareerStatus.ACTIVE;
    @Column(name = "active_slot", unique = true)
    private Integer activeSlot = 1;
    @Column(nullable = false)
    private int totalWeeks;
    @Column(nullable = false)
    private int currentWeek = 1;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private DayOfWeek currentWeekday = DayOfWeek.MONDAY;
    @Column(nullable = false)
    private int strength = 10;
    @Column(nullable = false)
    private int endurance = 10;
    @Column(nullable = false)
    private int agility = 10;
    @Column(nullable = false)
    private int technique = 10;
    @Column(nullable = false)
    private int discipline = 10;
    @Column(nullable = false)
    private int energy = 100;
    @Column(nullable = false)
    private int fatigue;
    @Column(nullable = false)
    private int mood = 60;
    @Column(nullable = false)
    private int confidence = 50;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @Column(nullable = false)
    private OffsetDateTime updatedAt;
    private OffsetDateTime completedAt;
    @Version
    private long version;

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public TrainingPlan getTrainingPlan() { return trainingPlan; }
    public void setTrainingPlan(TrainingPlan value) { trainingPlan = value; }
    public CareerStatus getStatus() { return status; }
    public void setStatus(CareerStatus value) {
        status = value;
        activeSlot = value == CareerStatus.ACTIVE ? 1 : null;
    }
    public int getTotalWeeks() { return totalWeeks; }
    public void setTotalWeeks(int value) { totalWeeks = value; }
    public int getCurrentWeek() { return currentWeek; }
    public void setCurrentWeek(int value) { currentWeek = value; }
    public DayOfWeek getCurrentWeekday() { return currentWeekday; }
    public void setCurrentWeekday(DayOfWeek value) { currentWeekday = value; }
    public int getStrength() { return strength; }
    public void setStrength(int value) { strength = value; }
    public int getEndurance() { return endurance; }
    public void setEndurance(int value) { endurance = value; }
    public int getAgility() { return agility; }
    public void setAgility(int value) { agility = value; }
    public int getTechnique() { return technique; }
    public void setTechnique(int value) { technique = value; }
    public int getDiscipline() { return discipline; }
    public void setDiscipline(int value) { discipline = value; }
    public int getEnergy() { return energy; }
    public void setEnergy(int value) { energy = value; }
    public int getFatigue() { return fatigue; }
    public void setFatigue(int value) { fatigue = value; }
    public int getMood() { return mood; }
    public void setMood(int value) { mood = value; }
    public int getConfidence() { return confidence; }
    public void setConfidence(int value) { confidence = value; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime value) { createdAt = value; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime value) { updatedAt = value; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime value) { completedAt = value; }
    public long getVersion() { return version; }
}
