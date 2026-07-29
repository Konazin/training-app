package com.trainingapp.model;

import jakarta.persistence.*;

@Entity
@Table(name = "workout_session_lock")
public class WorkoutSessionLock {
    @Id
    private Integer id;

    protected WorkoutSessionLock() {}
    public WorkoutSessionLock(Integer id) { this.id = id; }
    public Integer getId() { return id; }
}
