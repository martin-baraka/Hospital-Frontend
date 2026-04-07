package com.example.hospital.controllers;

import com.example.hospital.entities.User;
import com.example.hospital.repositories.UserRepository;
import com.example.hospital.services.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class HmsReportsController {

    private final UserRepository userRepository;
    private final DashboardService dashboardService;

    public HmsReportsController(UserRepository userRepository, DashboardService dashboardService) {
        this.userRepository = userRepository;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        User u = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (u.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(30);
        var dto = dashboardService.getDashboardData(start, end);
        return ResponseEntity.ok(Map.of(
                "startDate", start,
                "endDate", end,
                "analytics", dto
        ));
    }

    @GetMapping(value = "/export/csv", produces = "text/csv")
    public ResponseEntity<String> exportCsv(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        User u = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (u.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(30);
        var dto = dashboardService.getDashboardData(start, end);

        String csv = String.join("\n",
                "metric,value",
                "start_date," + start,
                "end_date," + end,
                "new_registrations," + dto.getNewRegistrations(),
                "patients_served," + dto.getPatientsServed(),
                "average_revenue_per_patient," + dto.getAverageRevenuePerPatient(),
                "total_revenue," + dto.getTotalRevenue(),
                "service_revenue," + dto.getServiceRevenue(),
                "product_revenue," + dto.getProductRevenue(),
                "total_expenses," + dto.getTotalExpenses(),
                "profit_loss," + dto.getProfitLoss(),
                "unpaid_amount," + dto.getUnpaidAmount(),
                "inventory_value," + dto.getInventoryValue(),
                "average_items_per_completed_visit," + dto.getAverageItemsPerCompletedVisit()
        );

        String filename = "hms-report-" + start + "-to-" + end + ".csv";
        ResponseEntity<String> response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);

        return response;
    }

    @GetMapping(value = "/export/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> exportJson(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        User u = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (u.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(30);
        var dto = dashboardService.getDashboardData(start, end);

        String filename = "hms-report-" + start + "-to-" + end + ".json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "startDate", start,
                        "endDate", end,
                        "analytics", dto,
                        "reportType", "dashboard"
                ));
    }
}
