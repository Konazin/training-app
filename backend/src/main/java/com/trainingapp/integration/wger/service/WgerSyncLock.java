package com.trainingapp.integration.wger.service;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "wger_sync_lock")
public class WgerSyncLock {
    @Id
    private Integer id;
    @Column(length = 100)
    private String owner;
    private OffsetDateTime startedAt;

    protected WgerSyncLock() {}

    public WgerSyncLock(Integer id) {
        this.id = id;
    }

    public Integer getId() { return id; }
    public String getOwner() { return owner; }
    public void setOwner(String value) { owner = value; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime value) { startedAt = value; }
}
