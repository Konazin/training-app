package com.trainingapp.integration.wger;

import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.integration.wger.mapper.WgerMediaContext;
import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseMediaType;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WgerExerciseMapperTest {
    private final WgerExerciseMapper mapper = new WgerExerciseMapper();

    @Test
    void mapsTranslationMediaLicenseAndSafeText() {
        var source = exercise(List.of(
                translation(2, "Push-up", "English"),
                translation(7, "Flexão", "<p>Primeiro.</p><script>ruim()</script><br>Segundo.")
        ), true);
        ExerciseDefinition mapped = mapper.map(source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition());
        var media = mapper.media(source, "https://wger.de/api/v2", mapped);

        assertThat(mapped.getName()).isEqualTo("Flexão");
        assertThat(mapped.getDescription()).isEqualTo("Primeiro.\n\nSegundo.");
        assertThat(mapped.getCategory()).isEqualTo(ExerciseCategory.STRENGTH);
        assertThat(mapped.getLicenseName()).isEqualTo("CC-BY-SA 4");
        assertThat(mapped.getAuthor()).isEqualTo("Autor");
        assertThat(media).hasSize(3);
        assertThat(media).filteredOn(item -> item.getType() == ExerciseMediaType.VIDEO).hasSize(2);
        assertThat(media).allMatch(item -> item.getUrl().startsWith("https://"));
        assertThat(media).allMatch(item -> item.getLicenseUrl().equals("https://license.test"));
        assertThat(media).allMatch(item -> !item.getSourceUrl().equals(item.getUrl()));
        assertThat(media).filteredOn(item -> item.getType() == ExerciseMediaType.IMAGE)
                .singleElement().extracting(item -> item.getThumbnailUrl()).isEqualTo("https://wger.de/thumb.webp");
    }

    @Test
    void fallsBackToEnglishAndSupportsExercisesWithoutVideo() {
        var source = exercise(List.of(translation(2, "Push-up", "Safe")), false);
        ExerciseDefinition mapped = mapper.map(source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition());
        assertThat(mapped.getName()).isEqualTo("Push-up");
        assertThat(mapper.media(source, "https://wger.de/api/v2", mapped))
                .noneMatch(item -> item.getType() == ExerciseMediaType.VIDEO);
        assertThat(mapper.category("categoria desconhecida")).isEqualTo(ExerciseCategory.TECHNIQUE);
        assertThat(WgerExerciseMapper.safeText("<b>Texto</b>&amp; mais")).isEqualTo("Texto& mais");
    }

    @Test
    void sourceUrlPrefersTranslationObjectUrl() {
        var source = exercise(List.of(new WgerExerciseInfo.WgerTranslation(
                1, "Flexão", "", 7, "Autor", "https://example.test/translation"
        )), false);
        assertThat(mapper.map(source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition()).getSourceUrl())
                .isEqualTo("https://example.test/translation");
    }

    @Test
    void sourceUrlFallsBackToPublicWgerUrl() {
        var source = withPublicUrl(exercise(List.of(new WgerExerciseInfo.WgerTranslation(
                1, "Flexão", "", 7, "Autor", null
        )), false), "https://wger.de/exercise/454/view");
        assertThat(mapper.map(source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition()).getSourceUrl())
                .isEqualTo("https://wger.de/exercise/454/view");
    }

    @Test
    void sourceUrlRejectsHttpAndUsesApiWhenMetadataIsMissing() {
        var http = withPublicUrl(exercise(List.of(new WgerExerciseInfo.WgerTranslation(
                1, "Flexão", "", 7, "Autor", "http://unsafe.test/object"
        )), false), "http://unsafe.test/exercise");
        assertThat(mapper.map(http, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition()).getSourceUrl())
                .isEqualTo("https://wger.de/api/v2/exerciseinfo/454/");

        var absent = withPublicUrl(exercise(List.of(new WgerExerciseInfo.WgerTranslation(
                1, "Flexão", "", 7, null, null
        )), false), null);
        assertThat(mapper.map(absent, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition()).getSourceUrl())
                .isEqualTo("https://wger.de/api/v2/exerciseinfo/454/");
    }

    @Test
    void mediaUsesExplicitContextAndDoesNotTreatObjectUrlAsLicenseUrl() {
        var source = exercise(List.of(translation(7, "Flexão", "")), true);
        ExerciseDefinition exercise = mapper.map(
                source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition());
        var result = mapper.media(
                source,
                "https://wger.de/api/v2",
                exercise,
                new WgerMediaContext(
                        "https://wger.de/exercise/454/view",
                        "https://wger.de/api/v2/exerciseinfo/454/",
                        "CC-BY-SA 4",
                        "https://license.test/legal",
                        "General author")
        );

        assertThat(result.errors()).isEmpty();
        assertThat(result.media()).allSatisfy(media -> {
            assertThat(media.getLicenseUrl()).isEqualTo("https://license.test/legal");
            assertThat(media.getSourceUrl())
                    .isIn("https://source.test", "https://wger.de/exercise/454/view")
                    .isNotEqualTo(media.getUrl());
            assertThat(media.getAuthor()).isIn("Autor", "General author");
        });
    }

    @Test
    void rejectsMissingIdsHttpUrlsAndNegativeMetadataWithoutCreatingCollisions() {
        var source = replaceMedia(
                exercise(List.of(translation(7, "Flexão", "")), false),
                List.of(
                        new WgerExerciseInfo.WgerImage(null, "https://wger.de/image.webp", null,
                                false, null, null, null),
                        new WgerExerciseInfo.WgerImage(2, "http://wger.de/image.webp", null,
                                false, null, null, null)
                ),
                List.of(
                        new WgerExerciseInfo.WgerVideo(null, "https://wger.de/video.mp4", false,
                                "10", 100, 100, "mp4", null, null, null),
                        new WgerExerciseInfo.WgerVideo(3, "https://wger.de/video.mp4", false,
                                "-1", -100, 100, "mp4", null, null, null)
                )
        );
        ExerciseDefinition exercise = mapper.map(
                source, 7, 2, "https://wger.de/api/v2", new ExerciseDefinition());

        var result = mapper.media(
                source, "https://wger.de/api/v2", exercise,
                mapper.mediaContext(source, "https://wger.de/api/v2", exercise));

        assertThat(result.media()).isEmpty();
        assertThat(result.errors()).hasSize(4);
        assertThat(result.errors()).anyMatch(error -> error.contains("image sem ID externo"));
        assertThat(result.errors()).anyMatch(error -> error.contains("video sem ID externo"));
        assertThat(result.errors()).noneMatch(error -> error.contains("null:"));
    }

    private WgerExerciseInfo exercise(List<WgerExerciseInfo.WgerTranslation> translations, boolean videos) {
        return new WgerExerciseInfo(454, "uuid", OffsetDateTime.now(),
                new WgerExerciseInfo.WgerNamed(8, "Arms"),
                List.of(new WgerExerciseInfo.WgerMuscle(4, "Pectoralis", "Chest")),
                List.of(new WgerExerciseInfo.WgerMuscle(5, "Triceps", "Triceps")),
                List.of(new WgerExerciseInfo.WgerNamed(7, "bodyweight")),
                new WgerExerciseInfo.WgerLicense(2, "Creative Commons", "CC-BY-SA 4", "https://license.test"),
                "Autor", List.of(new WgerExerciseInfo.WgerImage(697, "/image.webp",
                new WgerExerciseInfo.WgerThumbnails("https://wger.de/small.webp", "https://wger.de/thumb.webp", null),
                true, "CC", "https://source.test", "Autor")), translations,
                videos ? List.of(
                        new WgerExerciseInfo.WgerVideo(41, "https://wger.de/video.mp4", true, "12.4", 1280, 720, "mp4", "CC", "https://source.test", "Autor"),
                        new WgerExerciseInfo.WgerVideo(42, "/video-alt.mp4", false, "10", 720, 720, "mp4", null, null, null)
                ) : List.of(), "https://wger.de/exercise/454/view");
    }

    private WgerExerciseInfo.WgerTranslation translation(int language, String name, String description) {
        return new WgerExerciseInfo.WgerTranslation(language, name, description, language, "Autor", "https://source.test");
    }

    private WgerExerciseInfo withPublicUrl(WgerExerciseInfo source, String publicUrl) {
        return new WgerExerciseInfo(
                source.id(), source.uuid(), source.lastUpdateGlobal(), source.category(), source.muscles(),
                source.secondaryMuscles(), source.equipment(), source.license(), source.licenseAuthor(),
                source.images(), source.translations(), source.videos(), publicUrl
        );
    }

    private WgerExerciseInfo replaceMedia(
            WgerExerciseInfo source,
            List<WgerExerciseInfo.WgerImage> images,
            List<WgerExerciseInfo.WgerVideo> videos
    ) {
        return new WgerExerciseInfo(
                source.id(), source.uuid(), source.lastUpdateGlobal(), source.category(), source.muscles(),
                source.secondaryMuscles(), source.equipment(), source.license(), source.licenseAuthor(),
                images, source.translations(), videos, source.publicUrl()
        );
    }
}
