package com.trainingapp.config;

import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@Profile("dev")
public class TrainingPlanWeekMigration implements HibernatePropertiesCustomizer {
    private final DataSource dataSource;

    public TrainingPlanWeekMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        migrate();
    }

    public void migrate() {
        try (Connection connection = dataSource.getConnection()) {
            if (!tableExists(connection, "TRAINING_PLAN_DAYS")) return;
            connection.setAutoCommit(false);
            try {
                consolidateDuplicates(connection);
                completeMissingDays(connection);
                try (Statement statement = connection.createStatement()) {
                    statement.execute("""
                            ALTER TABLE training_plan_days
                            ADD CONSTRAINT IF NOT EXISTS uq_training_plan_weekday
                            UNIQUE (training_plan_id, weekday)
                            """);
                }
                connection.commit();
            } catch (RuntimeException cause) {
                connection.rollback();
                throw cause;
            } catch (SQLException cause) {
                connection.rollback();
                throw cause;
            }
        } catch (SQLException cause) {
            throw new IllegalStateException("Falha ao migrar os sete dias das fichas", cause);
        }
    }

    private void consolidateDuplicates(Connection connection) throws SQLException {
        Set<Long> daysWithData = daysWithData(connection);
        Map<String, List<DayRow>> groups = new HashMap<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("""
                     SELECT id, training_plan_id, weekday
                     FROM training_plan_days
                     ORDER BY training_plan_id, weekday, id
                     """)) {
            while (rows.next()) {
                DayRow row = new DayRow(
                        rows.getLong("id"),
                        rows.getLong("training_plan_id"),
                        rows.getString("weekday"),
                        daysWithData.contains(rows.getLong("id")));
                groups.computeIfAbsent(row.planId() + ":" + row.weekday(), ignored -> new ArrayList<>()).add(row);
            }
        }

        try (PreparedStatement delete = connection.prepareStatement(
                "DELETE FROM training_plan_days WHERE id = ?")) {
            for (List<DayRow> duplicates : groups.values()) {
                if (duplicates.size() < 2) continue;
                List<DayRow> populated = duplicates.stream().filter(DayRow::hasData).toList();
                if (populated.size() > 1) {
                    DayRow row = populated.getFirst();
                    throw new IllegalStateException(
                            "Migração interrompida: ficha " + row.planId()
                                    + " possui dias " + row.weekday()
                                    + " duplicados com exercícios ou atividades");
                }
                DayRow keep = populated.isEmpty() ? duplicates.getFirst() : populated.getFirst();
                for (DayRow duplicate : duplicates) {
                    if (duplicate.id() == keep.id()) continue;
                    delete.setLong(1, duplicate.id());
                    delete.addBatch();
                }
            }
            delete.executeBatch();
        }
    }

    private Set<Long> daysWithData(Connection connection) throws SQLException {
        Set<Long> ids = new HashSet<>();
        if (tableExists(connection, "TRAINING_DAY_EXERCISES")) {
            collectIds(connection, "SELECT DISTINCT plan_day_id FROM training_day_exercises", ids);
        }
        if (tableExists(connection, "REST_DAY_ACTIVITIES")) {
            collectIds(connection, "SELECT DISTINCT plan_day_id FROM rest_day_activities", ids);
        }
        return ids;
    }

    private void collectIds(Connection connection, String sql, Set<Long> ids) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery(sql)) {
            while (rows.next()) ids.add(rows.getLong(1));
        }
    }

    private void completeMissingDays(Connection connection) throws SQLException {
        Map<Long, Set<String>> weekdaysByPlan = new HashMap<>();
        try (Statement statement = connection.createStatement();
             ResultSet plans = statement.executeQuery("SELECT id FROM training_plans")) {
            while (plans.next()) weekdaysByPlan.put(plans.getLong(1), new HashSet<>());
        }
        try (Statement statement = connection.createStatement();
             ResultSet days = statement.executeQuery("SELECT training_plan_id, weekday FROM training_plan_days")) {
            while (days.next()) {
                weekdaysByPlan.computeIfAbsent(days.getLong(1), ignored -> new HashSet<>())
                        .add(days.getString(2));
            }
        }
        try (PreparedStatement insert = connection.prepareStatement("""
                INSERT INTO training_plan_days
                    (training_plan_id, weekday, title, description, sort_order,
                     rest_day, estimated_duration_minutes, notes)
                VALUES (?, ?, '', '', ?, FALSE, 0, '')
                """)) {
            for (var entry : weekdaysByPlan.entrySet()) {
                for (DayOfWeek weekday : DayOfWeek.values()) {
                    if (entry.getValue().contains(weekday.name())) continue;
                    insert.setLong(1, entry.getKey());
                    insert.setString(2, weekday.name());
                    insert.setInt(3, weekday.getValue());
                    insert.addBatch();
                }
            }
            insert.executeBatch();
        }
    }

    private boolean tableExists(Connection connection, String name) throws SQLException {
        try (ResultSet tables = connection.getMetaData().getTables(null, null, name, new String[]{"TABLE"})) {
            return tables.next();
        }
    }

    private record DayRow(long id, long planId, String weekday, boolean hasData) {}
}
