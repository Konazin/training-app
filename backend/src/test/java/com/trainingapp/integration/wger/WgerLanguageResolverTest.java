package com.trainingapp.integration.wger;

import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.integration.wger.service.WgerLanguageResolver;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WgerLanguageResolverTest {
    private final WgerExerciseMapper mapper = new WgerExerciseMapper();

    @Test
    void exactRegionalPortugueseWins() {
        assertThat(selected(
                List.of(language(13, "pt-br"), language(7, "pt"), language(2, "en")),
                List.of(translation(7, "Português"), translation(13, "Português brasileiro"))
        )).isEqualTo("Português brasileiro");
    }

    @Test
    void regionalPortugueseFallsBackToBasePortuguese() {
        assertThat(selected(
                List.of(language(7, "pt"), language(2, "en")),
                List.of(translation(2, "English"), translation(7, "Português"))
        )).isEqualTo("Português");
    }

    @Test
    void missingPortugueseUsesExactEnglishFallback() {
        assertThat(selected(
                List.of(language(2, "en")),
                List.of(translation(9, "Deutsch"), translation(2, "English"))
        )).isEqualTo("English");
    }

    @Test
    void unknownLanguagesUseFirstValidTranslationLast() {
        assertThat(selected(
                List.of(language(9, "de")),
                List.of(translation(9, ""), translation(4, "Français"), translation(6, "Español"))
        )).isEqualTo("Français");
    }

    private String selected(List<WgerLanguage> languages, List<WgerExerciseInfo.WgerTranslation> translations) {
        var priority = WgerLanguageResolver.resolve(languages, "pt-br", "en");
        return mapper.selectTranslation(translations, priority).name();
    }

    private WgerLanguage language(int id, String code) {
        return new WgerLanguage(id, code);
    }

    private WgerExerciseInfo.WgerTranslation translation(int language, String name) {
        return new WgerExerciseInfo.WgerTranslation(language, name, "", language, null, null);
    }
}
