package com.trainingapp.event;

import java.time.OffsetDateTime;

public sealed interface TrainingDomainEvent {
    Long aggregateId();
    OffsetDateTime occurredAt();

    record SessionStarted(Long aggregateId, OffsetDateTime occurredAt) implements TrainingDomainEvent {}
    record SessionCompleted(Long aggregateId, OffsetDateTime occurredAt) implements TrainingDomainEvent {}
    record SessionAbandoned(Long aggregateId, OffsetDateTime occurredAt) implements TrainingDomainEvent {}
    record ExerciseCompleted(Long aggregateId, OffsetDateTime occurredAt) implements TrainingDomainEvent {}
    record SetCompleted(Long aggregateId, OffsetDateTime occurredAt) implements TrainingDomainEvent {}
}
