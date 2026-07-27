package com.trainingapp.umamusume.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class UmaEffects {
    private int strengthDelta;
    private int enduranceDelta;
    private int agilityDelta;
    private int techniqueDelta;
    private int disciplineDelta;
    private int energyDelta;
    private int fatigueDelta;
    private int moodDelta;
    private int confidenceDelta;

    public UmaEffects() {}

    public UmaEffects(
            int strengthDelta,
            int enduranceDelta,
            int agilityDelta,
            int techniqueDelta,
            int disciplineDelta,
            int energyDelta,
            int fatigueDelta,
            int moodDelta,
            int confidenceDelta
    ) {
        this.strengthDelta = strengthDelta;
        this.enduranceDelta = enduranceDelta;
        this.agilityDelta = agilityDelta;
        this.techniqueDelta = techniqueDelta;
        this.disciplineDelta = disciplineDelta;
        this.energyDelta = energyDelta;
        this.fatigueDelta = fatigueDelta;
        this.moodDelta = moodDelta;
        this.confidenceDelta = confidenceDelta;
    }

    public int getStrengthDelta() { return strengthDelta; }
    public int getEnduranceDelta() { return enduranceDelta; }
    public int getAgilityDelta() { return agilityDelta; }
    public int getTechniqueDelta() { return techniqueDelta; }
    public int getDisciplineDelta() { return disciplineDelta; }
    public int getEnergyDelta() { return energyDelta; }
    public int getFatigueDelta() { return fatigueDelta; }
    public int getMoodDelta() { return moodDelta; }
    public int getConfidenceDelta() { return confidenceDelta; }
}
