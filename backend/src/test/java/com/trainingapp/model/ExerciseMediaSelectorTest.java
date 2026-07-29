package com.trainingapp.model;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ExerciseMediaSelectorTest {
    @Test
    void selectsMainThenSortOrderThenLocalIdWithinRequestedType() {
        ExerciseMedia image = media(1L, ExerciseMediaType.IMAGE, true, 0);
        ExerciseMedia laterMain = media(9L, ExerciseMediaType.VIDEO, true, 2);
        ExerciseMedia earlierMainHighId = media(8L, ExerciseMediaType.VIDEO, true, 1);
        ExerciseMedia earlierMainLowId = media(7L, ExerciseMediaType.VIDEO, true, 1);
        ExerciseMedia nonMain = media(2L, ExerciseMediaType.VIDEO, false, 0);

        assertThat(ExerciseMediaSelector.primary(
                List.of(image, laterMain, earlierMainHighId, earlierMainLowId, nonMain),
                ExerciseMediaType.VIDEO
        )).contains(earlierMainLowId);
        assertThat(ExerciseMediaSelector.primary(List.of(image), ExerciseMediaType.VIDEO)).isEmpty();
    }

    private ExerciseMedia media(Long id, ExerciseMediaType type, boolean main, int sortOrder) {
        ExerciseMedia media = new ExerciseMedia();
        ReflectionTestUtils.setField(media, "id", id);
        media.setType(type);
        media.setMain(main);
        media.setSortOrder(sortOrder);
        return media;
    }
}
