package com.trainingapp.integration.wger.service;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "wger_sync_runs")
public class WgerSyncRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 20) private String status;
    @Column(nullable = false) private boolean dryRun;
    @Column(nullable = false) private OffsetDateTime startedAt;
    private OffsetDateTime finishedAt;
    private int pages;
    private int created;
    private int updated;
    private int skipped;
    private int failed;
    @Column(length = 500) private String message;

    public Long getId() { return id; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean value) { dryRun = value; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime value) { startedAt = value; }
    public OffsetDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(OffsetDateTime value) { finishedAt = value; }
    public int getPages() { return pages; }
    public void setPages(int value) { pages = value; }
    public int getCreated() { return created; }
    public void setCreated(int value) { created = value; }
    public int getUpdated() { return updated; }
    public void setUpdated(int value) { updated = value; }
    public int getSkipped() { return skipped; }
    public void setSkipped(int value) { skipped = value; }
    public int getFailed() { return failed; }
    public void setFailed(int value) { failed = value; }
    public String getMessage() { return message; }
    public void setMessage(String value) { message = value; }
}
