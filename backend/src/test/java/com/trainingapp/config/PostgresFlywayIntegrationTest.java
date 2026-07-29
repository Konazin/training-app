package com.trainingapp.config;

import com.trainingapp.TrainingApiApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class PostgresFlywayIntegrationTest {
    private static final List<String> TABLES = List.of(
            "exercise_definitions",
            "exercise_media",
            "training_plans",
            "training_plan_days",
            "workout_sessions",
            "workout_session_lock",
            "wger_sync_runs",
            "uma_careers",
            "uma_career_turns"
    );

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("training")
            .withUsername("training")
            .withPassword("training-test");

    @Test
    void flywayCreatesSchemaAndSecondProductionStartupLeavesItUnchanged() {
        Map<String, Long> firstCounts;
        String firstChecksum;

        try (ConfigurableApplicationContext context = start()) {
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            assertThat(existingTables(jdbc)).containsAll(TABLES);
            assertThat(jdbc.queryForObject(
                    "select count(*) from workout_session_lock where id = 1", Long.class)).isOne();
            assertThat(jdbc.queryForObject(
                    "select count(*) from flyway_schema_history where success", Long.class)).isOne();
            firstChecksum = jdbc.queryForObject(
                    "select checksum::text from flyway_schema_history where version = '1'", String.class);
            firstCounts = TABLES.stream().collect(java.util.stream.Collectors.toMap(
                    table -> table,
                    table -> jdbc.queryForObject("select count(*) from " + table, Long.class)
            ));
            assertThat(firstCounts)
                    .containsEntry("workout_session_lock", 1L)
                    .allSatisfy((table, count) -> {
                        if (!table.equals("workout_session_lock")) {
                            assertThat(count).as("production seed in " + table).isZero();
                        }
                    });
        }

        try (ConfigurableApplicationContext context = start()) {
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            assertThat(existingTables(jdbc)).containsAll(TABLES);
            assertThat(jdbc.queryForObject(
                    "select count(*) from flyway_schema_history where success", Long.class)).isOne();
            assertThat(jdbc.queryForObject(
                    "select checksum::text from flyway_schema_history where version = '1'", String.class))
                    .isEqualTo(firstChecksum);
            TABLES.forEach(table -> assertThat(
                    jdbc.queryForObject("select count(*) from " + table, Long.class))
                    .as(table)
                    .isEqualTo(firstCounts.get(table)));
        }
    }

    private ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(TrainingApiApplication.class)
                .web(WebApplicationType.NONE)
                .run(
                        "--spring.profiles.active=prod",
                        "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                        "--spring.datasource.username=" + POSTGRES.getUsername(),
                        "--spring.datasource.password=" + POSTGRES.getPassword(),
                        "--app.api-token=integration-test-token",
                        "--wger.integration-enabled=false"
                );
    }

    private List<String> existingTables(JdbcTemplate jdbc) {
        return jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'",
                String.class
        );
    }
}
