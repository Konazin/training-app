package com.trainingapp.controller;

import com.trainingapp.dto.DashboardResponse;
import com.trainingapp.service.WorkoutService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final WorkoutService workoutService;

    public DashboardController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping
    public DashboardResponse dashboard() {
        return workoutService.dashboard();
    }
}
