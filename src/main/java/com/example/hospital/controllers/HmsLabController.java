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
import java.util.HashMap;
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

    private boolean isLabOrAdmin(User user) {
        return user.getRole() == User.Role.LAB_TECHNICIAN || user.getRole() == User.Role.ADMIN;
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
            if (!isLabOrAdmin(user)) {
                return ResponseEntity.status(403).body("Only lab users can create tests in lab module");
            }

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
        if (!isLabOrAdmin(user)) {
            return ResponseEntity.status(403).build();
        }
        Optional<LabTest> opt = labTestService.getById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        LabTest test = opt.get();
        // Lab tech can claim unassigned tests; otherwise must be assigned to them (admin bypasses).
        if (user.getRole() == User.Role.LAB_TECHNICIAN) {
            if (test.getLabTechnician() == null) {
                test.setLabTechnician(user);
            } else if (!test.getLabTechnician().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
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

    @PostMapping("/tests/{id}/send-to-clinician")
    public ResponseEntity<Map<String, Object>> sendToClinician(@PathVariable Integer id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (!isLabOrAdmin(user)) {
            return ResponseEntity.status(403).build();
        }

        Optional<LabTest> opt = labTestService.getById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        LabTest test = opt.get();

        if (user.getRole() == User.Role.LAB_TECHNICIAN) {
            if (test.getLabTechnician() == null) {
                test.setLabTechnician(user);
            } else if (!test.getLabTechnician().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
        }

        Visit visit = test.getVisit();
        if (visit == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lab test has no linked visit"));
        }
        visit.setCurrentQueue(Visit.VisitQueue.CLINICIAN);
        visitRepository.save(visit);

        return ResponseEntity.ok(Map.of(
                "message", "Lab results sent to clinician",
                "visitId", visit.getId(),
                "currentQueue", visit.getCurrentQueue().name()
        ));
    }

    @DeleteMapping("/tests/{id}")
    public ResponseEntity<Void> deleteLabTest(@PathVariable Integer id, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        if (user.getRole() != User.Role.ADMIN) return ResponseEntity.status(403).build();
        labTestService.delete(id);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> labTestRow(LabTest t) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", t.getId());
        row.put("visitId", t.getVisitId());
        row.put("patientName", t.getVisit() != null && t.getVisit().getPatient() != null ? t.getVisit().getPatient().getName() : "");
        row.put("testName", t.getTestName() != null ? t.getTestName() : "");
        row.put("result", t.getResult() != null ? t.getResult() : "");
        row.put("referenceRange", t.getReferenceRange() != null ? t.getReferenceRange() : "");
        row.put("notes", t.getNotes() != null ? t.getNotes() : "");
        row.put("status", t.getStatus() != null ? t.getStatus().name() : "PENDING");
        row.put("labTechnician", t.getLabTechnician() != null ? t.getLabTechnician().getUsername() : "");
        return row;
    }
}