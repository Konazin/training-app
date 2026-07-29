package com.trainingapp.model;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class ExerciseMediaSelector {
    private static final Comparator<ExerciseMedia> PRIORITY =
            Comparator.comparing(ExerciseMedia::isMain).reversed()
                    .thenComparingInt(ExerciseMedia::getSortOrder)
                    .thenComparing(ExerciseMedia::getId, Comparator.nullsLast(Long::compareTo));

    private ExerciseMediaSelector() {}

    public static Optional<ExerciseMedia> primary(List<ExerciseMedia> media, ExerciseMediaType type) {
        if (media == null) return Optional.empty();
        return media.stream()
                .filter(item -> item != null && item.getType() == type)
                .min(PRIORITY);
    }
}
