package com.trainingapp.integration.wger;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.dto.WgerPage;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.integration.wger.service.*;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.repository.ExerciseDefinitionRepository;
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

@ExtendWith(MockitoExtension.class)
class WgerExerciseSyncServiceTest {
    @Mock WgerExerciseClient client;
    @Mock WgerExerciseMapper mapper;
    @Mock ExerciseDefinitionRepository exercises;
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
                exercises, runs, transactionManager);
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
        when(mapper.map(eq(item(1)), any(), any(), anyString(), any())).thenThrow(new IllegalArgumentException("bad item"));
        when(mapper.map(eq(item(2)), any(), any(), anyString(), any())).thenAnswer(call -> call.getArgument(4));
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

    private void languages() {
        lenient().when(client.languages()).thenReturn(new WgerPage<>(2, null, null,
                List.of(new WgerLanguage(7, "pt"), new WgerLanguage(2, "en"))));
    }

    private WgerExerciseInfo item(int id) {
        return new WgerExerciseInfo(id, "uuid-" + id, null, null, List.of(), List.of(),
                List.of(), null, null, List.of(), List.of(), List.of());
    }
}
