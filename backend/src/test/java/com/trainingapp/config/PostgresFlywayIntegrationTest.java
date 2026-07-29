package com.trainingapp.config;

import com.trainingapp.TrainingApiApplication;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
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
            "wger_sync_lock",
            "uma_careers",
            "uma_career_turns"
    );

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("training")
            .withUsername("training")
            .withPassword("training-test");

    private JdbcTemplate jdbc;

    @BeforeEach
    void resetDatabase() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.execute("drop schema public cascade");
        jdbc.execute("create schema public");
    }

    @Test
    void flywayCreatesSchemaAndSecondProductionStartupLeavesItUnchanged() {
        Map<String, Long> firstCounts;
        Map<String, String> firstChecksums;

        try (ConfigurableApplicationContext context = start()) {
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            assertThat(existingTables(jdbc)).containsAll(TABLES);
            assertThat(jdbc.queryForObject(
                    "select count(*) from workout_session_lock where id = 1", Long.class)).isOne();
            assertThat(jdbc.queryForObject(
                    "select count(*) from wger_sync_lock where id = 1", Long.class)).isOne();
            assertThat(jdbc.queryForObject(
                    "select count(*) from flyway_schema_history where success", Long.class)).isEqualTo(4);
            firstChecksums = checksums(jdbc);
            firstCounts = TABLES.stream().collect(java.util.stream.Collectors.toMap(
                    table -> table,
                    table -> jdbc.queryForObject("select count(*) from " + table, Long.class)
            ));
            assertThat(firstCounts)
                    .containsEntry("workout_session_lock", 1L)
                    .allSatisfy((table, count) -> {
                        if (!table.equals("workout_session_lock") && !table.equals("wger_sync_lock")) {
                            assertThat(count).as("production seed in " + table).isZero();
                        }
                    });
        }

        try (ConfigurableApplicationContext context = start()) {
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            assertThat(existingTables(jdbc)).containsAll(TABLES);
            assertThat(jdbc.queryForObject(
                    "select count(*) from flyway_schema_history where success", Long.class)).isEqualTo(4);
            assertThat(checksums(jdbc)).isEqualTo(firstChecksums);
            TABLES.forEach(table -> assertThat(
                    jdbc.queryForObject("select count(*) from " + table, Long.class))
                    .as(table)
                    .isEqualTo(firstCounts.get(table)));
        }
    }

    @Test
    void upgradesOriginalV1DataThroughCurrentMigrationsWithoutChangingChecksums() {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("1"))
                .load()
                .migrate();

        jdbc.update("""
                insert into wger_sync_runs(
                    status, dry_run, started_at, pages, created, updated, skipped, failed, message
                ) values ('COMPLETED', false, now(), 1, 1, 0, 0, 0, 'existing')
                """);
        Long sessionId = jdbc.queryForObject("""
                insert into workout_sessions(
                    workout_name_snapshot, scheduled_date, started_at, status,
                    paused_duration_seconds, total_duration_seconds, notes
                ) values ('Existing', current_date, now(), 'COMPLETED', 0, 10, '')
                returning id
                """, Long.class);
        Long exerciseId = jdbc.queryForObject("""
                insert into workout_session_exercises(
                    session_id, exercise_name_snapshot, muscle_group_snapshot, category_snapshot,
                    timed_snapshot, primary_video_url, primary_image_url, attribution, sort_order,
                    planned_sets, planned_min_reps, planned_max_reps, rest_seconds, status, notes
                ) values (?, 'Existing exercise', 'Chest', 'STRENGTH', false,
                    'https://media.test/video.mp4', null, 'legacy attribution',
                    0, 1, 8, 10, 60, 'COMPLETED', '')
                returning id
                """, Long.class, sessionId);

        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();

        assertThat(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success", Long.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject(
                "select error_details from wger_sync_runs where message = 'existing'", String.class)).isNull();
        assertThat(jdbc.queryForObject(
                "select primary_video_source_url from workout_session_exercises where id = ?",
                String.class, exerciseId)).isNull();
        assertThat(jdbc.queryForObject(
                "select primary_video_url from workout_session_exercises where id = ?",
                String.class, exerciseId)).isEqualTo("https://media.test/video.mp4");

        Map<String, String> beforeRestart = checksums(jdbc);
        try (ConfigurableApplicationContext ignored = start()) {
            assertThat(jdbc.queryForObject(
                    "select count(*) from workout_sessions where id = ?", Long.class, sessionId)).isOne();
        }
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();
        assertThat(checksums(jdbc)).isEqualTo(beforeRestart);
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

    private Map<String, String> checksums(JdbcTemplate jdbc) {
        return jdbc.query(
                "select version, checksum::text from flyway_schema_history where success order by installed_rank",
                result -> {
                    Map<String, String> values = new java.util.LinkedHashMap<>();
                    while (result.next()) values.put(result.getString(1), result.getString(2));
                    return values;
                }
        );
    }
}
