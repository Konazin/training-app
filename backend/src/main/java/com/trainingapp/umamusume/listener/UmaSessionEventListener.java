package com.trainingapp.umamusume.listener;

import com.trainingapp.event.TrainingDomainEvent;
import com.trainingapp.repository.WorkoutSessionRepository;
import com.trainingapp.umamusume.service.UmaCareerService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class UmaSessionEventListener {
    private final WorkoutSessionRepository sessions;
    private final UmaCareerService careers;

    public UmaSessionEventListener(WorkoutSessionRepository sessions, UmaCareerService careers) {
        this.sessions = sessions;
        this.careers = careers;
    }

    @EventListener
    public void onCompleted(TrainingDomainEvent.SessionCompleted event) {
        sessions.findById(event.aggregateId()).ifPresent(careers::sessionCompleted);
    }

    @EventListener
    public void onAbandoned(TrainingDomainEvent.SessionAbandoned event) {
        sessions.findById(event.aggregateId()).ifPresent(careers::sessionAbandoned);
    }
}
