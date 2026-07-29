package com.trainingapp.integration.wger.service;

import com.trainingapp.integration.wger.dto.WgerLanguage;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class WgerLanguageResolver {
    private WgerLanguageResolver() {}

    public static List<Integer> resolve(
            List<WgerLanguage> languages,
            String requested,
            String fallback
    ) {
        Map<String, Integer> ids = new LinkedHashMap<>();
        if (languages != null) {
            languages.forEach(language -> {
                String code = normalize(language.shortName());
                if (!code.isBlank() && language.id() != null) ids.putIfAbsent(code, language.id());
            });
        }
        List<Integer> result = new ArrayList<>();
        add(ids, result, normalize(requested));
        add(ids, result, base(requested));
        add(ids, result, normalize(fallback));
        add(ids, result, base(fallback));
        return result;
    }

    static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    private static String base(String value) {
        String normalized = normalize(value);
        int separator = normalized.indexOf('-');
        return separator < 0 ? normalized : normalized.substring(0, separator);
    }

    private static void add(Map<String, Integer> ids, List<Integer> result, String code) {
        Integer id = ids.get(code);
        if (id != null && !result.contains(id)) result.add(id);
    }
}
