package com.trainingapp.service;

import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaSource;
import com.trainingapp.model.ExerciseMediaType;
import com.trainingapp.model.ExerciseSource;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Transactional
class ExerciseLibraryQueryTest {
    @Autowired EntityManager entityManager;
    @Autowired ExerciseLibraryService service;

    @Test
    void mediaForPageIsLoadedInOneBatchInsteadOfOneQueryPerExercise() {
        for (int index = 0; index < 6; index++) {
            ExerciseDefinition exercise = exercise(index);
            entityManager.persist(exercise);
            entityManager.persist(media(exercise, index));
        }
        entityManager.flush();
        entityManager.clear();

        SessionFactory sessionFactory = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
        sessionFactory.getStatistics().clear();

        var page = service.findAll(0, 20, "query-test-", null, null, null, null, null, false);

        assertThat(page.content()).hasSize(6);
        assertThat(page.content()).allMatch(item -> item.media().size() == 1);
        assertThat(sessionFactory.getStatistics().getPrepareStatementCount()).isLessThanOrEqualTo(3);
    }

    private ExerciseDefinition exercise(int index) {
        ExerciseDefinition exercise = new ExerciseDefinition();
        exercise.setNormalizedName("query-test-" + index);
        exercise.setName("Query test " + index);
        exercise.setDescription("");
        exercise.setPrimaryMuscleGroup("Core");
        exercise.setSecondaryMuscleGroups("");
        exercise.setEquipment("None");
        exercise.setCategory(ExerciseCategory.STRENGTH);
        exercise.setDifficulty("Test");
        exercise.setInstructions("");
        exercise.setNotes("");
        exercise.setMediaUrl("");
        exercise.setSource(ExerciseSource.CUSTOM);
        exercise.setCustom(true);
        OffsetDateTime now = OffsetDateTime.now();
        exercise.setCreatedAt(now);
        exercise.setUpdatedAt(now);
        return exercise;
    }

    private ExerciseMedia media(ExerciseDefinition exercise, int index) {
        ExerciseMedia media = new ExerciseMedia();
        media.setExerciseDefinition(exercise);
        media.setType(ExerciseMediaType.VIDEO);
        media.setSource(ExerciseMediaSource.CUSTOM);
        media.setExternalId("query-test-" + index);
        media.setUrl("https://example.test/" + index + ".mp4");
        media.setMain(true);
        media.setSortOrder(0);
        OffsetDateTime now = OffsetDateTime.now();
        media.setCreatedAt(now);
        media.setUpdatedAt(now);
        return media;
    }
}
