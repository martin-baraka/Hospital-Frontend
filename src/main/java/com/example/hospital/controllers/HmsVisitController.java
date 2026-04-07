package com.example.hospital.controllers;

import com.example.hospital.entities.*;
import com.example.hospital.services.VisitWorkflowService;
import com.example.hospital.repositories.UserRepository;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visits")
public class HmsVisitController {

    private final VisitWorkflowService visitWorkflowService;
    private final UserRepository userRepository;

    public HmsVisitController(VisitWorkflowService visitWorkflowService, UserRepository userRepository) {
        this.visitWorkflowService = visitWorkflowService;
        this.userRepository = userRepository;
    }

    private boolean canSeeMoney(Authentication auth) {
        User u = userRepository.findByUsername(auth.getName()).orElseThrow();
        return u.getRole() == User.Role.ADMIN || u.getRole() == User.Role.CASHIER;
    }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "date") String sort) {
        Visit.Status st = null;
        if (status != null && !status.isBlank()) {
            st = Visit.Status.valueOf(status.toUpperCase());
        }
        return visitWorkflowService.listVisits(st, sort).stream().map(this::visitRow).collect(Collectors.toList());
    }

    private Map<String, Object> visitRow(Visit v) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", v.getId());
        m.put("visitDate", v.getVisitDate() != null ? v.getVisitDate().toString() : "");
        m.put("status", v.getStatus().name());
        m.put("currentQueue", v.getCurrentQueue().name());
        m.put("patientId", v.getPatient().getId());
        m.put("patientName", v.getPatient().getName());
        return m;
    }

    private Map<String, Object> labTestRow(LabTest t) {
        return Map.of(
                "id", t.getId(),
                "visitId", t.getVisitId(),
                "testName", t.getTestName(),
                "status", t.getStatus().name(),
                "result", t.getResult() != null ? t.getResult() : "",
                "referenceRange", t.getReferenceRange() != null ? t.getReferenceRange() : "",
                "notes", t.getNotes() != null ? t.getNotes() : ""
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable int id, Authentication auth) {
        Visit v = visitWorkflowService.findVisit(id).orElseThrow();
        boolean money = canSeeMoney(auth);
        var billOpt = visitWorkflowService.billForVisit(id);
        var items = visitWorkflowService.billItemsForVisit(id);
        var labs = visitWorkflowService.labTestsForVisit(id);

        List<Map<String, Object>> itemMaps = items.stream().map(bi -> {
            Map<String, Object> im = new HashMap<>();
            im.put("id", bi.getId());
            im.put("description", bi.getDescription() != null ? bi.getDescription() : "");
            im.put("itemType", bi.getItemType().name());
            im.put("quantity", bi.getQuantity());
            if (money) {
                im.put("itemRefId", bi.getItemRefId());
                im.put("amount", bi.getAmount());
            }
            return im;
        }).collect(Collectors.toList());

        Map<String, Object> billMap = getStringObjectMap(billOpt, money);

        Map<String, Object> visitMap = getStringObjectMap(v);

        Map<String, Object> patientMap = new HashMap<>();
        patientMap.put("id", v.getPatient().getId());
        patientMap.put("name", v.getPatient().getName());
        patientMap.put("gender", v.getPatient().getGender() != null ? v.getPatient().getGender() : "");
        patientMap.put("phone", v.getPatient().getPhone() != null ? v.getPatient().getPhone() : "");
        patientMap.put("dob", v.getPatient().getDob() != null ? v.getPatient().getDob().toString() : "");

        Map<String, Object> root = new HashMap<>();
        root.put("visit", visitMap);
        root.put("patient", patientMap);
        root.put("bill", billMap != null ? billMap : Map.of());
        root.put("billItems", itemMaps);
        root.put("labTests", labs);
        return ResponseEntity.ok(root);
    }

    @GetMapping("/{visitId}/lab-results")
    public ResponseEntity<List<Map<String, Object>>> labResults(@PathVariable int visitId) {
        List<Map<String, Object>> labResults = visitWorkflowService.labTestsForVisit(visitId).stream()
                .map(this::labTestRow)
                .collect(Collectors.toList());
        return ResponseEntity.ok(labResults);
    }

    @GetMapping("/{visitId}/diagnosis")
    public ResponseEntity<Map<String, Object>> diagnosis(@PathVariable int visitId) {
        Visit v = visitWorkflowService.findVisit(visitId).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "vitals", v.getVitals() != null ? v.getVitals() : "",
                "diagnosis", v.getDiagnosis() != null ? v.getDiagnosis() : "",
                "notes", v.getNotes() != null ? v.getNotes() : ""
        ));
    }

    @GetMapping("/{visitId}/doctor")
    public ResponseEntity<Map<String, Object>> doctorView(@PathVariable int visitId) {
        Visit v = visitWorkflowService.findVisit(visitId).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "diagnosis", Map.of(
                        "vitals", v.getVitals() != null ? v.getVitals() : "",
                        "diagnosis", v.getDiagnosis() != null ? v.getDiagnosis() : "",
                        "notes", v.getNotes() != null ? v.getNotes() : ""
                ),
                "labResults", visitWorkflowService.labTestsForVisit(visitId).stream().map(this::labTestRow).collect(Collectors.toList())
        ));
    }

    public record CheckoutReq(BigDecimal paidMobile, BigDecimal paidCash, BigDecimal paidCard,
                               BigDecimal paidCheque, String forwardTo) {}

    @PostMapping("/{visitId}/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@PathVariable int visitId,
                                                        @RequestBody CheckoutReq req,
                                                        Authentication auth) {
        if (!canSeeMoney(auth)) {
            return ResponseEntity.status(403).build();
        }
        Bill bill = visitWorkflowService.applyPayment(
                visitId,
                req.paidMobile(),
                req.paidCash(),
                req.paidCard(),
                req.paidCheque()
        );
        Map<String, Object> response = new HashMap<>();
        response.put("bill", getStringObjectMap(Optional.of(bill), true));
        if (req.forwardTo() != null && !req.forwardTo().isBlank()) {
            try {
                Visit.VisitQueue queue = Visit.VisitQueue.valueOf(req.forwardTo().toUpperCase());
                Visit forwarded = visitWorkflowService.forward(visitId, queue);
                response.put("forwardedTo", forwarded.getCurrentQueue().name());
            } catch (IllegalArgumentException ex) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid queue: " + req.forwardTo());
            }
        }
        return ResponseEntity.ok(response);
    }

    private static @Nullable Map<String, Object> getStringObjectMap(Optional<Bill> billOpt, boolean money) {
        Map<String, Object> billMap = null;
        if (billOpt.isPresent()) {
            Bill b = billOpt.get();
            billMap = new HashMap<>();
            billMap.put("id", b.getId());
            billMap.put("status", b.getStatus().name());
            billMap.put("billDate", b.getBillDate() != null ? b.getBillDate().toString() : "");
            if (money) {
                billMap.put("totalAmount", b.getTotalAmount());
                billMap.put("totalPaid", b.getTotalPaid());
                billMap.put("openBalance", b.getOpenBalance());
                billMap.put("paidMobile", b.getPaidMobile());
                billMap.put("paidCash", b.getPaidCash());
                billMap.put("paidCard", b.getPaidCard());
                billMap.put("paidCheque", b.getPaidCheque());
            }
        }
        return billMap;
    }

    private static @NonNull Map<String, Object> getStringObjectMap(Visit v) {
        Map<String, Object> visitMap = new HashMap<>();
        visitMap.put("id", v.getId());
        visitMap.put("visitDate", v.getVisitDate() != null ? v.getVisitDate().toString() : "");
        visitMap.put("status", v.getStatus().name());
        visitMap.put("currentQueue", v.getCurrentQueue().name());
        visitMap.put("notes", v.getNotes() != null ? v.getNotes() : "");
        visitMap.put("vitals", v.getVitals() != null ? v.getVitals() : "");
        visitMap.put("diagnosis", v.getDiagnosis() != null ? v.getDiagnosis() : "");
        return visitMap;
    }

    public record CreateVisitRequest(Integer existingPatientId, Patient newPatient) {}

    @PostMapping
    public ResponseEntity<Visit> create(@RequestBody CreateVisitRequest body) {
        Visit v = visitWorkflowService.createVisit(body.existingPatientId(), body.newPatient());
        return ResponseEntity.ok(v);
    }

    public record BillItemReq(String itemType, int itemRefId, String description, BigDecimal lineTotal, int quantity) {}

    @PostMapping("/{visitId}/bill-items")
    public ResponseEntity<BillItem> addLine(@PathVariable int visitId, @RequestBody BillItemReq req) {
        BillItem.ItemType type = BillItem.ItemType.valueOf(req.itemType().toUpperCase());
        return ResponseEntity.ok(visitWorkflowService.addBillItem(visitId, type, req.itemRefId(),
                req.description(), req.lineTotal(), req.quantity()));
    }

    @DeleteMapping("/bill-items/{billItemId}")
    public ResponseEntity<Void> removeLine(@PathVariable int billItemId) {
        visitWorkflowService.deleteBillItem(billItemId);
        return ResponseEntity.noContent().build();
    }

    public record NotesReq(String notes) {}

    @PatchMapping("/{visitId}/cashier-notes")
    public ResponseEntity<Visit> cashierNotes(@PathVariable int visitId, @RequestBody NotesReq req) {
        visitWorkflowService.updateCashierNotes(visitId, req.notes());
        return ResponseEntity.ok(visitWorkflowService.findVisit(visitId).orElseThrow());
    }

    public record ClinicalReq(String vitals, String diagnosis, String notes) {}

    @PatchMapping("/{visitId}/clinical")
    public ResponseEntity<Visit> clinical(@PathVariable int visitId, @RequestBody ClinicalReq req) {
        visitWorkflowService.updateClinical(visitId, req.vitals(), req.diagnosis(), req.notes());
        return ResponseEntity.ok(visitWorkflowService.findVisit(visitId).orElseThrow());
    }

    public record ForwardReq(String queue) {}

    @PostMapping("/{visitId}/forward")
    public ResponseEntity<Visit> forward(@PathVariable int visitId, @RequestBody ForwardReq req) {
        Visit.VisitQueue q = Visit.VisitQueue.valueOf(req.queue().toUpperCase());
        try {
            return ResponseEntity.ok(visitWorkflowService.forward(visitId, q));
        } catch (IllegalStateException ex) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/{visitId}/complete")
    public ResponseEntity<Visit> complete(@PathVariable int visitId) {
        return ResponseEntity.ok(visitWorkflowService.complete(visitId));
    }

    public record LabReq(String testName) {}

    @PostMapping("/{visitId}/lab-tests")
    public ResponseEntity<LabTest> addLab(@PathVariable int visitId, @RequestBody LabReq req) {
        return ResponseEntity.ok(visitWorkflowService.addLabTest(visitId, req.testName()));
    }

    public record LabUpdateReq(String result, String referenceRange, String notes) {}

    @PatchMapping("/lab-tests/{testId}")
    public ResponseEntity<LabTest> updateLab(@PathVariable int testId, @RequestBody LabUpdateReq req) {
        return ResponseEntity.ok(visitWorkflowService.updateLabTest(testId, req.result(), req.referenceRange(), req.notes()));
    }

    @DeleteMapping("/lab-tests/{testId}")
    public ResponseEntity<Void> deleteLab(@PathVariable int testId) {
        visitWorkflowService.deleteLabTest(testId);
        return ResponseEntity.noContent().build();
    }

    public record PaymentReq(BigDecimal paidMobile, BigDecimal paidCash, BigDecimal paidCard, BigDecimal paidCheque) {}

    @PostMapping("/{visitId}/payment")
    public ResponseEntity<Bill> payment(@PathVariable int visitId, @RequestBody PaymentReq req, Authentication auth) {
        if (!canSeeMoney(auth)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(visitWorkflowService.applyPayment(
                visitId,
                req.paidMobile(),
                req.paidCash(),
                req.paidCard(),
                req.paidCheque()
        ));
    }
}
