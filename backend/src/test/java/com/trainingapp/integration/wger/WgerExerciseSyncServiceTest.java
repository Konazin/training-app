package com.trainingapp.integration.wger;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.dto.WgerPage;
import com.trainingapp.integration.wger.dto.WgerSyncRequest;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.integration.wger.service.*;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaSource;
import com.trainingapp.model.ExerciseMediaType;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.ExerciseMediaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WgerExerciseSyncServiceTest {
    @Mock WgerExerciseClient client;
    @Mock WgerExerciseMapper mapper;
    @Mock ExerciseDefinitionRepository exercises;
    @Mock ExerciseMediaRepository media;
    @Mock WgerSyncRunRepository runs;
    @Mock PlatformTransactionManager transactionManager;
    @Mock TransactionStatus transactionStatus;
    private WgerExerciseSyncService service;

    @BeforeEach
    void setup() {
        when(runs.save(any())).thenAnswer(call -> call.getArgument(0));
        lenient().when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(transactionStatus);
        service = new WgerExerciseSyncService(client, mapper,
                new WgerProperties(true, "https://wger.de/api/v2", "pt-br", "en", 15, 100, 0),
                exercises, media, runs, transactionManager);
    }

    @Test
    void dryRunDoesNotPersistAndPageFailureBecomesPartial() {
        languages();
        when(client.exercises(0)).thenReturn(new WgerPage<>(2, "next", null, List.of(item(1), item(2))));
        when(client.exercises(100)).thenThrow(new RuntimeException("upstream offline"));

        var result = service.sync(true);

        assertThat(result.status()).isEqualTo("PARTIAL");
        assertThat(result.created()).isEqualTo(2);
        verify(exercises, never()).save(any());
    }

    @Test
    void repeatedSyncUpdatesSameExternalExerciseAndContinuesAfterBadItem() {
        languages();
        var persisted = new ExerciseDefinition();
        when(client.exercises(0)).thenReturn(new WgerPage<>(2, null, null, List.of(item(1), item(2))),
                new WgerPage<>(1, null, null, List.of(item(2))));
        when(exercises.findBySourceAndExternalId(ExerciseSource.WGER, "1")).thenReturn(Optional.empty());
        when(exercises.findBySourceAndExternalId(ExerciseSource.WGER, "2"))
                .thenReturn(Optional.empty(), Optional.of(persisted));
        when(mapper.map(eq(item(1)), anyList(), anyString(), any())).thenThrow(new IllegalArgumentException("bad item"));
        when(mapper.map(eq(item(2)), anyList(), anyString(), any())).thenAnswer(call -> call.getArgument(3));
        when(exercises.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(mapper.media(any(), anyString(), any())).thenReturn(List.of());

        var first = service.sync(false);
        var second = service.sync(false);

        assertThat(first.failed()).isOne();
        assertThat(first.created()).isOne();
        assertThat(second.updated()).isOne();
        verify(exercises, times(3)).findBySourceAndExternalId(eq(ExerciseSource.WGER), anyString());
    }

    @Test
    void simultaneousSyncReturnsConflict() throws Exception {
        languages();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(client.exercises(0)).thenAnswer(call -> {
            entered.countDown();
            release.await(2, TimeUnit.SECONDS);
            return new WgerPage<>(0, null, null, List.of());
        });
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> service.sync(true));
            assertThat(entered.await(2, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> service.sync(true)).isInstanceOf(DomainConflictException.class);
            release.countDown();
            assertThat(first.get(2, TimeUnit.SECONDS).status()).isEqualTo("COMPLETED");
        }
    }

    @Test
    void requestPageLimitIsPerRunAndVideoFilterSkipsItemsWithoutVideo() {
        languages();
        when(client.exercises(0)).thenReturn(new WgerPage<>(2, "next", null, List.of(item(1))));

        var result = service.sync(new WgerSyncRequest(true, 1, true));

        assertThat(result.status()).isEqualTo("COMPLETED");
        assertThat(result.pages()).isOne();
        assertThat(result.skipped()).isOne();
        verify(client, never()).exercises(100);
    }

    @Test
    void individualErrorsAreSanitizedLimitedAndReportedAsPartial() {
        languages();
        List<WgerExerciseInfo> items = java.util.stream.IntStream.range(0, 12)
                .mapToObj(this::item).toList();
        when(client.exercises(0)).thenReturn(new WgerPage<>(12, null, null, items));
        when(exercises.findBySourceAndExternalId(eq(ExerciseSource.WGER), anyString()))
                .thenReturn(Optional.empty());
        when(mapper.map(any(), anyList(), anyString(), any()))
                .thenThrow(new IllegalArgumentException("invalid\nupstream payload"));

        var result = service.sync(false);

        assertThat(result.status()).isEqualTo("PARTIAL");
        assertThat(result.failed()).isEqualTo(12);
        assertThat(result.errors()).hasSize(10);
        assertThat(result.errors()).allMatch(error -> !error.message().contains("\n"));
    }

    @Test
    void repeatedMediaUpsertPreservesLocalId() {
        languages();
        WgerExerciseInfo source = item(2);
        ExerciseDefinition exercise = new ExerciseDefinition();
        ExerciseMedia existingMedia = media("video:41", "https://old.test/video.mp4");
        ReflectionTestUtils.setField(existingMedia, "id", 55L);
        existingMedia.setExerciseDefinition(exercise);
        exercise.getMedia().add(existingMedia);

        when(client.exercises(0)).thenReturn(new WgerPage<>(1, null, null, List.of(source)));
        when(exercises.findBySourceAndExternalId(ExerciseSource.WGER, "2"))
                .thenReturn(Optional.of(exercise));
        when(mapper.map(eq(source), anyList(), anyString(), same(exercise))).thenReturn(exercise);
        when(exercises.saveAndFlush(exercise)).thenReturn(exercise);
        when(mapper.media(eq(source), anyString(), same(exercise)))
                .thenAnswer(call -> List.of(media("video:41", "https://new.test/video.mp4")));
        when(media.findAllBySource(ExerciseMediaSource.WGER)).thenReturn(List.of(existingMedia));

        service.sync(false);
        service.sync(false);

        assertThat(exercise.getMedia()).singleElement().satisfies(saved -> {
            assertThat(saved.getId()).isEqualTo(55L);
            assertThat(saved.getUrl()).isEqualTo("https://new.test/video.mp4");
        });
    }

    @Test
    void syncNeverChangesCustomOrLegacyMedia() {
        languages();
        WgerExerciseInfo source = item(2);
        ExerciseDefinition exercise = new ExerciseDefinition();
        ExerciseMedia custom = media("custom:1", "https://custom.test/video.mp4");
        custom.setSource(ExerciseMediaSource.CUSTOM);
        custom.setExerciseDefinition(exercise);
        ExerciseMedia legacy = media("legacy:1", "https://legacy.test/video.mp4");
        legacy.setSource(ExerciseMediaSource.LEGACY);
        legacy.setExerciseDefinition(exercise);
        exercise.getMedia().addAll(List.of(custom, legacy));

        when(client.exercises(0)).thenReturn(new WgerPage<>(1, null, null, List.of(source)));
        when(exercises.findBySourceAndExternalId(ExerciseSource.WGER, "2"))
                .thenReturn(Optional.of(exercise));
        when(mapper.map(eq(source), anyList(), anyString(), same(exercise))).thenReturn(exercise);
        when(exercises.saveAndFlush(exercise)).thenReturn(exercise);
        when(mapper.media(eq(source), anyString(), same(exercise)))
                .thenAnswer(call -> List.of(media("video:41", "https://wger.test/video.mp4")));

        service.sync(false);

        assertThat(exercise.getMedia()).hasSize(3);
        assertThat(custom.getUrl()).isEqualTo("https://custom.test/video.mp4");
        assertThat(legacy.getUrl()).isEqualTo("https://legacy.test/video.mp4");
        verify(media).findAllBySource(ExerciseMediaSource.WGER);
        verify(media, never()).findAllBySource(ExerciseMediaSource.CUSTOM);
        verify(media, never()).findAllBySource(ExerciseMediaSource.LEGACY);
    }

    private void languages() {
        lenient().when(client.languages()).thenReturn(new WgerPage<>(2, null, null,
                List.of(new WgerLanguage(7, "pt"), new WgerLanguage(2, "en"))));
    }

    private WgerExerciseInfo item(int id) {
        return new WgerExerciseInfo(id, "uuid-" + id, null, null, List.of(), List.of(),
                List.of(), null, null, List.of(), List.of(), List.of(), null);
    }

    private ExerciseMedia media(String externalId, String url) {
        ExerciseMedia value = new ExerciseMedia();
        value.setType(ExerciseMediaType.VIDEO);
        value.setSource(ExerciseMediaSource.WGER);
        value.setExternalId(externalId);
        value.setUrl(url);
        value.setSortOrder(0);
        value.setCreatedAt(java.time.OffsetDateTime.now());
        value.setUpdatedAt(java.time.OffsetDateTime.now());
        return value;
    }
}
