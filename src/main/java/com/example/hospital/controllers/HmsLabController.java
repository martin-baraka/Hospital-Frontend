package com.example.hospital.controllers;

import com.example.hospital.entities.LabTest;
import com.example.hospital.entities.User;
import com.example.hospital.entities.Visit;
import com.example.hospital.repositories.UserRepository;
import com.example.hospital.repositories.VisitRepository;
import com.example.hospital.services.LabTestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/lab")
public class HmsLabController {

    private static final Logger logger = Logger.getLogger(HmsLabController.class.getName());

    private final LabTestService labTestService;
    private final UserRepository userRepository;
    private final VisitRepository visitRepository;

    public HmsLabController(LabTestService labTestService, UserRepository userRepository, VisitRepository visitRepository) {
        this.labTestService = labTestService;
        this.userRepository = userRepository;
        this.visitRepository = visitRepository;
    }

    @GetMapping("/tests")
    public List<Map<String, Object>> getLabTests(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        List<LabTest> tests;
        if (user.getRole() == User.Role.LAB_TECHNICIAN) {
            // Lab tech sees tests assigned to them or unassigned
            tests = labTestService.getAll().stream()
                    .filter(t -> t.getLabTechnician() == null || t.getLabTechnician().getId().equals(user.getId()))
                    .collect(Collectors.toList());
        } else {
            // Others see all
            tests = labTestService.getAll();
        }
        return tests.stream().map(this::labTestRow).collect(Collectors.toList());
    }

    @PostMapping("/tests")
    public ResponseEntity<?> createLabTest(@RequestBody Map<String, Object> body, Authentication auth) {
        try {
            logger.info("Creating lab test with body: " + body);
            Optional<User> userOpt = userRepository.findByUsername(auth.getName());
            if (userOpt.isEmpty()) {
                logger.warning("User not found: " + auth.getName());
                return ResponseEntity.status(401).body("User not found");
            }
            User user = userOpt.get();

            Object visitIdObj = body.get("visitId");
            Integer visitId = null;
            if (visitIdObj instanceof Number) {
                visitId = ((Number) visitIdObj).intValue();
            } else if (visitIdObj instanceof String) {
                try {
                    visitId = Integer.parseInt((String) visitIdObj);
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body("visitId must be a valid integer");
                }
            }
            String testName = (String) body.get("testName");
            
            if (visitId == null) {
                logger.warning("visitId is null");
                return ResponseEntity.badRequest().body("visitId is required");
            }
            if (testName == null || testName.trim().isEmpty()) {
                logger.warning("testName is empty");
                return ResponseEntity.badRequest().body("testName is required");
            }

            Optional<Visit> visitOpt = visitRepository.findById(visitId);
            if (visitOpt.isEmpty()) {
                logger.warning("Visit not found with id: " + visitId);
                return ResponseEntity.status(404).body("Visit not found with id: " + visitId);
            }
            Visit visit = visitOpt.get();

            LabTest test = LabTest.builder()
                    .visit(visit)
                    .testName(testName)
                    .status(LabTest.Status.PENDING)
                    .build();
            if (user.getRole() == User.Role.LAB_TECHNICIAN) {
                test.setLabTechnician(user);
            }
            LabTest saved = labTestService.save(test);
            logger.info("Lab test created successfully with id: " + saved.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.severe("Error creating lab test: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/tests/{id}")
    public ResponseEntity<LabTest> updateLabTest(@PathVariable Integer id, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        Optional<LabTest> opt = labTestService.getById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        LabTest test = opt.get();
        // Check permission
        if (user.getRole() != User.Role.ADMIN && (test.getLabTechnician() == null || !test.getLabTechnician().getId().equals(user.getId()))) {
            return ResponseEntity.status(403).build();
        }
        if (body.containsKey("result")) test.setResult((String) body.get("result"));
        if (body.containsKey("referenceRange")) test.setReferenceRange((String) body.get("referenceRange"));
        if (body.containsKey("notes")) test.setNotes((String) body.get("notes"));
        if (body.containsKey("status")) test.setStatus(LabTest.Status.valueOf((String) body.get("status")));
        if (body.containsKey("labTechnicianId") && user.getRole() == User.Role.ADMIN) {
            Object techIdObj = body.get("labTechnicianId");
            Integer techId = null;
            if (techIdObj instanceof Number) {
                techId = ((Number) techIdObj).intValue();
            } else if (techIdObj instanceof String) {
                techId = Integer.parseInt((String) techIdObj);
            }
            if (techId != null) {
                User tech = userRepository.findById(techId).orElse(null);
                test.setLabTechnician(tech);
            }
        }
        return ResponseEntity.ok(labTestService.save(test));
    }

    @DeleteMapping("/tests/{id}")
    public ResponseEntity<Void> deleteLabTest(@PathVariable Integer id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() != User.Role.ADMIN) return ResponseEntity.status(403).build();
        labTestService.delete(id);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> labTestRow(LabTest t) {
        return Map.of(
                "id", t.getId(),
                "visitId", t.getVisitId(),
                "patientName", t.getVisit().getPatient().getName(),
                "testName", t.getTestName(),
                "result", t.getResult(),
                "referenceRange", t.getReferenceRange(),
                "notes", t.getNotes(),
                "status", t.getStatus().name(),
                "labTechnician", t.getLabTechnician() != null ? t.getLabTechnician().getUsername() : null
        );
    }
}