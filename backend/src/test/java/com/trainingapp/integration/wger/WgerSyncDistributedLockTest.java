package com.trainingapp.integration.wger;

import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.dto.WgerPage;
import com.trainingapp.integration.wger.mapper.WgerExerciseMapper;
import com.trainingapp.integration.wger.service.WgerExerciseSyncService;
import com.trainingapp.integration.wger.service.WgerSyncLockManager;
import com.trainingapp.integration.wger.service.WgerSyncRunRepository;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.ExerciseMediaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
class WgerSyncDistributedLockTest {
    @Autowired WgerSyncLockManager lockManager;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void twoServiceInstancesSharingDatabaseCannotSyncAtSameTime() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        WgerExerciseClient firstClient = client(() -> {
            entered.countDown();
            release.await(3, TimeUnit.SECONDS);
        });
        WgerExerciseClient secondClient = client(() -> {});
        WgerExerciseSyncService first = service(firstClient);
        WgerExerciseSyncService second = service(secondClient);

        try (var executor = Executors.newSingleThreadExecutor()) {
            var running = executor.submit(() -> first.sync(true));
            assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> second.sync(true)).isInstanceOf(DomainConflictException.class);
            release.countDown();
            assertThat(running.get(3, TimeUnit.SECONDS).status()).isEqualTo("COMPLETED");
        }

        assertThat(second.sync(true).status()).isEqualTo("COMPLETED");
    }

    private WgerExerciseSyncService service(WgerExerciseClient client) {
        WgerSyncRunRepository runs = mock(WgerSyncRunRepository.class);
        when(runs.save(any())).thenAnswer(call -> call.getArgument(0));
        return new WgerExerciseSyncService(
                client,
                mock(WgerExerciseMapper.class),
                new WgerProperties(true, "https://wger.de/api/v2", "pt-br", "en", 15, 100, 0, 60),
                mock(ExerciseDefinitionRepository.class),
                mock(ExerciseMediaRepository.class),
                runs,
                lockManager,
                transactionManager
        );
    }

    private WgerExerciseClient client(CheckedAction action) {
        WgerExerciseClient client = mock(WgerExerciseClient.class);
        when(client.languages()).thenReturn(new WgerPage<>(
                1, null, null, List.of(new WgerLanguage(2, "en"))));
        try {
            when(client.exercises(0)).thenAnswer(call -> {
                action.run();
                return new WgerPage<>(0, null, null, List.of());
            });
        } catch (Exception impossible) {
            throw new IllegalStateException(impossible);
        }
        return client;
    }

    @FunctionalInterface
    private interface CheckedAction {
        void run() throws Exception;
    }
}
