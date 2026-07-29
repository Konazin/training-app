package com.trainingapp.integration.wger.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WgerExerciseInfo(
        Integer id,
        String uuid,
        @JsonProperty("last_update_global") OffsetDateTime lastUpdateGlobal,
        WgerNamed category,
        List<WgerMuscle> muscles,
        @JsonProperty("muscles_secondary") List<WgerMuscle> secondaryMuscles,
        List<WgerNamed> equipment,
        WgerLicense license,
        @JsonProperty("license_author") String licenseAuthor,
        List<WgerImage> images,
        List<WgerTranslation> translations,
        List<WgerVideo> videos,
        @JsonProperty("url") String publicUrl
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerNamed(Integer id, String name) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerMuscle(Integer id, String name, @JsonProperty("name_en") String nameEn) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerLicense(Integer id, @JsonProperty("full_name") String fullName,
                              @JsonProperty("short_name") String shortName, String url) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerTranslation(
            Integer id, String name, String description, Integer language,
            @JsonProperty("license_author") String licenseAuthor,
            @JsonProperty("license_object_url") String licenseObjectUrl
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerImage(
            Integer id, String image, WgerThumbnails thumbnails, @JsonProperty("is_main") boolean main,
            @JsonProperty("license_title") String licenseTitle,
            @JsonProperty("license_object_url") String licenseObjectUrl,
            @JsonProperty("license_author") String licenseAuthor
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerThumbnails(String small, String medium, String large) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WgerVideo(
            Integer id, String video, @JsonProperty("is_main") boolean main, String duration,
            Integer width, Integer height, String codec,
            @JsonProperty("license_title") String licenseTitle,
            @JsonProperty("license_object_url") String licenseObjectUrl,
            @JsonProperty("license_author") String licenseAuthor
    ) {}
}
