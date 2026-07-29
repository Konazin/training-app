package com.trainingapp.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "exercise_media", uniqueConstraints = @UniqueConstraint(
        name = "uk_exercise_media_source_external", columnNames = {"source", "external_id"}))
public class ExerciseMedia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_definition_id", nullable = false)
    private ExerciseDefinition exerciseDefinition;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ExerciseMediaType type;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ExerciseMediaSource source;
    @Column(name = "external_id", length = 100)
    private String externalId;
    @Column(nullable = false, length = 1000)
    private String url;
    @Column(length = 1000)
    private String thumbnailUrl;
    @Column(length = 100)
    private String mimeType;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
    @Column(name = "is_main", nullable = false)
    private boolean main;
    @Column(nullable = false)
    private int sortOrder;
    @Column(length = 200)
    private String licenseName;
    @Column(length = 1000)
    private String licenseUrl;
    @Column(length = 500)
    private String author;
    @Column(length = 1000)
    private String sourceUrl;
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public ExerciseDefinition getExerciseDefinition() { return exerciseDefinition; }
    public void setExerciseDefinition(ExerciseDefinition value) { exerciseDefinition = value; }
    public ExerciseMediaType getType() { return type; }
    public void setType(ExerciseMediaType value) { type = value; }
    public ExerciseMediaSource getSource() { return source; }
    public void setSource(ExerciseMediaSource value) { source = value; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String value) { externalId = value; }
    public String getUrl() { return url; }
    public void setUrl(String value) { url = value; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String value) { thumbnailUrl = value; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String value) { mimeType = value; }
    public Integer getWidth() { return width; }
    public void setWidth(Integer value) { width = value; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer value) { height = value; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer value) { durationSeconds = value; }
    public boolean isMain() { return main; }
    public void setMain(boolean value) { main = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public String getLicenseName() { return licenseName; }
    public void setLicenseName(String value) { licenseName = value; }
    public String getLicenseUrl() { return licenseUrl; }
    public void setLicenseUrl(String value) { licenseUrl = value; }
    public String getAuthor() { return author; }
    public void setAuthor(String value) { author = value; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String value) { sourceUrl = value; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime value) { createdAt = value; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime value) { updatedAt = value; }
}
