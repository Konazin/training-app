package com.trainingapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OrderBy;
import jakarta.persistence.FetchType;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exercise_definitions", uniqueConstraints = @UniqueConstraint(
        name = "uk_exercise_definition_source_external", columnNames = {"source", "external_id"}))
public class ExerciseDefinition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 140)
    private String normalizedName;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 600)
    private String description = "";
    @Column(nullable = false, length = 80)
    private String primaryMuscleGroup;
    @Column(length = 300)
    private String secondaryMuscleGroups = "";
    @Column(nullable = false, length = 80)
    private String equipment;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private ExerciseCategory category;
    @Column(nullable = false, length = 40)
    private String difficulty;
    @Column(length = 1500)
    private String instructions = "";
    @Column(length = 600)
    private String notes = "";
    @Column(length = 500)
    private String mediaUrl = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'SYSTEM'")
    private ExerciseSource source = ExerciseSource.SYSTEM;
    @Column(name = "external_id", length = 100)
    private String externalId;
    @Column(length = 100)
    private String externalBaseId;
    @Column(length = 1000)
    private String sourceUrl;
    @Column(length = 200)
    private String licenseName;
    @Column(length = 1000)
    private String licenseUrl;
    @Column(length = 500)
    private String author;
    private OffsetDateTime lastSyncedAt;
    private OffsetDateTime upstreamUpdatedAt;
    @OneToMany(mappedBy = "exerciseDefinition", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC, id ASC")
    private List<ExerciseMedia> media = new ArrayList<>();
    @Column(nullable = false)
    private boolean unilateral;
    @Column(nullable = false)
    private boolean timed;
    @Column(nullable = false)
    private boolean custom;
    @Column(nullable = false)
    private boolean archived;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public String getNormalizedName() { return normalizedName; }
    public void setNormalizedName(String value) { normalizedName = value; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getPrimaryMuscleGroup() { return primaryMuscleGroup; }
    public void setPrimaryMuscleGroup(String value) { primaryMuscleGroup = value; }
    public String getSecondaryMuscleGroups() { return secondaryMuscleGroups; }
    public void setSecondaryMuscleGroups(String value) { secondaryMuscleGroups = value; }
    public String getEquipment() { return equipment; }
    public void setEquipment(String value) { equipment = value; }
    public ExerciseCategory getCategory() { return category; }
    public void setCategory(ExerciseCategory value) { category = value; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String value) { difficulty = value; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String value) { instructions = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String value) { mediaUrl = value; }
    public ExerciseSource getSource() { return source; }
    public void setSource(ExerciseSource value) { source = value; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String value) { externalId = value; }
    public String getExternalBaseId() { return externalBaseId; }
    public void setExternalBaseId(String value) { externalBaseId = value; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String value) { sourceUrl = value; }
    public String getLicenseName() { return licenseName; }
    public void setLicenseName(String value) { licenseName = value; }
    public String getLicenseUrl() { return licenseUrl; }
    public void setLicenseUrl(String value) { licenseUrl = value; }
    public String getAuthor() { return author; }
    public void setAuthor(String value) { author = value; }
    public OffsetDateTime getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(OffsetDateTime value) { lastSyncedAt = value; }
    public OffsetDateTime getUpstreamUpdatedAt() { return upstreamUpdatedAt; }
    public void setUpstreamUpdatedAt(OffsetDateTime value) { upstreamUpdatedAt = value; }
    public List<ExerciseMedia> getMedia() { return media; }
    public boolean isUnilateral() { return unilateral; }
    public void setUnilateral(boolean value) { unilateral = value; }
    public boolean isTimed() { return timed; }
    public void setTimed(boolean value) { timed = value; }
    public boolean isCustom() { return custom; }
    public void setCustom(boolean value) { custom = value; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean value) { archived = value; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime value) { createdAt = value; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime value) { updatedAt = value; }
}
