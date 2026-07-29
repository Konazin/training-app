package com.trainingapp.integration.wger.mapper;

import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.model.*;
import com.trainingapp.service.ExerciseLibraryService;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class WgerExerciseMapper {
    public ExerciseDefinition map(WgerExerciseInfo source, Integer languageId, Integer fallbackLanguageId,
                                  String apiBaseUrl, ExerciseDefinition target) {
        return map(source, java.util.stream.Stream.of(languageId, fallbackLanguageId)
                .filter(java.util.Objects::nonNull).distinct().toList(), apiBaseUrl, target);
    }

    public ExerciseDefinition map(WgerExerciseInfo source, List<Integer> languagePriority,
                                  String apiBaseUrl, ExerciseDefinition target) {
        var translation = selectTranslation(source.translations(), languagePriority);
        String name = translation == null || blank(translation.name()) ? "Wger #" + source.id() : translation.name().trim();
        target.setName(name);
        target.setNormalizedName(ExerciseLibraryService.normalize(name) + " wger " + source.id());
        String description = safeText(translation == null ? "" : translation.description());
        target.setDescription(limit(description, 600));
        target.setInstructions(limit(description, 1500));
        target.setPrimaryMuscleGroup(firstMuscle(source.muscles()));
        target.setSecondaryMuscleGroups(joinMuscles(source.secondaryMuscles()));
        target.setEquipment(source.equipment() == null || source.equipment().isEmpty()
                ? "Não informado" : limit(source.equipment().stream().map(WgerExerciseInfo.WgerNamed::name)
                .filter(value -> !blank(value)).distinct().reduce((a, b) -> a + ", " + b).orElse("Não informado"), 80));
        target.setCategory(category(source.category() == null ? "" : source.category().name()));
        target.setDifficulty("Não informado");
        target.setNotes("");
        target.setMediaUrl("");
        target.setUnilateral(false);
        target.setTimed(false);
        target.setCustom(false);
        target.setArchived(false);
        target.setSource(ExerciseSource.WGER);
        target.setExternalId(String.valueOf(source.id()));
        target.setExternalBaseId(source.uuid());
        target.setSourceUrl(sourceUrl(translation, source, apiBaseUrl));
        target.setLicenseName(source.license() == null ? null : source.license().shortName());
        target.setLicenseUrl(source.license() == null ? null : https(source.license().url(), apiBaseUrl));
        target.setAuthor(firstNonBlank(translation == null ? null : translation.licenseAuthor(), source.licenseAuthor()));
        target.setUpstreamUpdatedAt(source.lastUpdateGlobal());
        target.setLastSyncedAt(OffsetDateTime.now());
        return target;
    }

    public List<ExerciseMedia> media(WgerExerciseInfo source, String apiBaseUrl, ExerciseDefinition exercise) {
        return media(source, apiBaseUrl, exercise, mediaContext(source, apiBaseUrl, exercise)).media();
    }

    public WgerMediaMappingResult media(
            WgerExerciseInfo source,
            String apiBaseUrl,
            ExerciseDefinition exercise,
            WgerMediaContext context
    ) {
        List<ExerciseMedia> mapped = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        for (WgerExerciseInfo.WgerVideo item : safe(source.videos())) {
            Integer duration = seconds(item.duration());
            addMedia(mapped, errors, exercise, ExerciseMediaType.VIDEO, item.id(), item.video(), null,
                    mime(item.codec()), item.width(), item.height(), duration, item.main(),
                    item.licenseTitle(), item.licenseObjectUrl(), item.licenseAuthor(), apiBaseUrl, context);
        }
        for (WgerExerciseInfo.WgerImage item : safe(source.images())) {
            addMedia(mapped, errors, exercise, ExerciseMediaType.IMAGE, item.id(), item.image(),
                    thumbnail(item.thumbnails()), null, null, null, null, item.main(),
                    item.licenseTitle(), item.licenseObjectUrl(), item.licenseAuthor(), apiBaseUrl, context);
        }
        for (int index = 0; index < mapped.size(); index++) mapped.get(index).setSortOrder(index);
        return new WgerMediaMappingResult(List.copyOf(mapped), List.copyOf(errors));
    }

    public WgerMediaContext mediaContext(
            WgerExerciseInfo source,
            String apiBaseUrl,
            ExerciseDefinition exercise
    ) {
        String suppliedPublicUrl = https(source.publicUrl(), apiBaseUrl);
        String publicUrl = suppliedPublicUrl != null && !suppliedPublicUrl.contains("/api/")
                ? suppliedPublicUrl : humanExerciseUrl(apiBaseUrl, source.id());
        return new WgerMediaContext(
                publicUrl,
                exercise.getSourceUrl(),
                exercise.getLicenseName(),
                exercise.getLicenseUrl(),
                exercise.getAuthor()
        );
    }

    public WgerExerciseInfo.WgerTranslation selectTranslation(
            List<WgerExerciseInfo.WgerTranslation> translations, Integer languageId, Integer fallbackLanguageId
    ) {
        return selectTranslation(translations, java.util.stream.Stream.of(languageId, fallbackLanguageId)
                .filter(java.util.Objects::nonNull).distinct().toList());
    }

    public WgerExerciseInfo.WgerTranslation selectTranslation(
            List<WgerExerciseInfo.WgerTranslation> translations, List<Integer> languagePriority
    ) {
        if (translations == null) return null;
        List<WgerExerciseInfo.WgerTranslation> valid = translations.stream()
                .filter(item -> item != null && !blank(item.name())).toList();
        if (languagePriority != null) {
            for (Integer language : languagePriority) {
                var match = valid.stream().filter(item -> java.util.Objects.equals(item.language(), language)).findFirst();
                if (match.isPresent()) return match.get();
            }
        }
        return valid.stream().findFirst().orElse(null);
    }

    public ExerciseCategory category(String value) {
        String normalized = ExerciseLibraryService.normalize(value);
        if (contains(normalized, "cardio")) return ExerciseCategory.CARDIO;
        if (contains(normalized, "stretch", "along")) return ExerciseCategory.STRETCHING;
        if (contains(normalized, "mobil")) return ExerciseCategory.MOBILITY;
        if (contains(normalized, "recovery", "recuper")) return ExerciseCategory.RECOVERY;
        if (contains(normalized, "strength", "arms", "legs", "chest", "back", "shoulders", "forca"))
            return ExerciseCategory.STRENGTH;
        return ExerciseCategory.TECHNIQUE;
    }

    public static String safeText(String html) {
        if (html == null) return "";
        return html.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", "")
                .replaceAll("(?i)<br\\s*/?>|</p>|</li>", "\n")
                .replaceAll("<[^>]*>", "")
                .replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                .replaceAll("[\\t\\x0B\\f\\r ]+", " ").replaceAll("\\n{3,}", "\n\n").trim();
    }

    private void addMedia(
            List<ExerciseMedia> mapped,
            List<String> errors,
            ExerciseDefinition exercise,
            ExerciseMediaType type,
            Integer id,
            String url,
            String thumbnail,
            String mime,
            Integer width,
            Integer height,
            Integer duration,
            boolean main,
            String licenseTitle,
            String licenseObjectUrl,
            String author,
            String baseUrl,
            WgerMediaContext context
    ) {
        String label = type.name().toLowerCase();
        if (id == null) {
            errors.add(label + " sem ID externo");
            return;
        }
        String secureUrl = https(url, baseUrl);
        if (secureUrl == null) {
            errors.add(label + ":" + id + " com URL ausente ou não HTTPS");
            return;
        }
        if (negative(width) || negative(height) || negative(duration)) {
            errors.add(label + ":" + id + " com dimensão ou duração negativa");
            return;
        }
        var media = new ExerciseMedia();
        media.setExerciseDefinition(exercise);
        media.setType(type);
        media.setSource(ExerciseMediaSource.WGER);
        media.setExternalId(label + ":" + id);
        media.setUrl(secureUrl);
        media.setThumbnailUrl(https(thumbnail, baseUrl));
        media.setMimeType(mime);
        media.setWidth(width);
        media.setHeight(height);
        media.setDurationSeconds(duration);
        media.setMain(main);
        media.setLicenseName(firstNonBlank(licenseTitle, context.licenseName()));
        media.setLicenseUrl(context.licenseUrl());
        media.setAuthor(firstNonBlank(author, context.author()));
        media.setSourceUrl(firstNonBlank(
                https(licenseObjectUrl, baseUrl),
                firstNonBlank(context.publicExerciseUrl(), context.exerciseSourceUrl())
        ));
        OffsetDateTime now = OffsetDateTime.now();
        media.setCreatedAt(now);
        media.setUpdatedAt(now);
        mapped.add(media);
    }

    private String publicSourceUrl(String baseUrl, Integer id) {
        URI base = URI.create(baseUrl);
        return base.getScheme() + "://" + base.getAuthority() + "/api/v2/exerciseinfo/" + id + "/";
    }
    private String sourceUrl(WgerExerciseInfo.WgerTranslation translation, WgerExerciseInfo source, String baseUrl) {
        String translationUrl = https(translation == null ? null : translation.licenseObjectUrl(), baseUrl);
        if (translationUrl != null) return translationUrl;
        String publicUrl = https(source.publicUrl(), baseUrl);
        return publicUrl != null ? publicUrl : publicSourceUrl(baseUrl, source.id());
    }
    private String https(String value, String baseUrl) {
        if (blank(value)) return null;
        URI uri = URI.create(value);
        URI resolved = uri.isAbsolute() ? uri : URI.create(baseUrl + "/").resolve(uri);
        return "https".equalsIgnoreCase(resolved.getScheme()) ? resolved.toString() : null;
    }
    private String firstMuscle(List<WgerExerciseInfo.WgerMuscle> values) {
        if (values == null || values.isEmpty()) return "Não informado";
        return limit(firstNonBlank(values.getFirst().nameEn(), values.getFirst().name()), 80);
    }
    private String joinMuscles(List<WgerExerciseInfo.WgerMuscle> values) {
        if (values == null) return "";
        return values.stream().map(item -> firstNonBlank(item.nameEn(), item.name())).filter(value -> !blank(value))
                .map(value -> limit(value, 80)).distinct().reduce((a, b) -> a + "|" + b).orElse("");
    }
    private String humanExerciseUrl(String baseUrl, Integer id) {
        URI base = URI.create(baseUrl);
        return base.getScheme() + "://" + base.getAuthority() + "/exercise/" + id + "/view";
    }
    private Integer seconds(String value) {
        if (blank(value)) return null;
        try { return (int) Math.round(Double.parseDouble(value)); } catch (Exception ignored) { return null; }
    }
    private String mime(String codec) { return blank(codec) ? "video/mp4" : "video/" + codec; }
    private String thumbnail(WgerExerciseInfo.WgerThumbnails thumbnails) {
        if (thumbnails == null) return null;
        return firstNonBlank(thumbnails.medium(), thumbnails.small());
    }
    private boolean contains(String value, String... candidates) {
        return Set.of(candidates).stream().anyMatch(value::contains);
    }
    private String firstNonBlank(String first, String second) { return blank(first) ? second : first; }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private boolean negative(Integer value) { return value != null && value < 0; }
    private <T> List<T> safe(List<T> value) { return value == null ? List.of() : value; }
    private String limit(String value, int max) { return value == null ? "" : value.substring(0, Math.min(value.length(), max)); }
}
