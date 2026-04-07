package com.example.hospital.services;

import com.example.hospital.entities.*;
import com.example.hospital.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class VisitWorkflowService {

    private static final BigDecimal Z = BigDecimal.ZERO;

    private final VisitRepository visitRepo;
    private final PatientRepository patientRepo;
    private final BillRepository billRepo;
    private final BillItemRepository billItemRepo;
    private final LabTestRepository labTestRepo;

    public VisitWorkflowService(
            VisitRepository visitRepo,
            PatientRepository patientRepo,
            BillRepository billRepo,
            BillItemRepository billItemRepo,
            LabTestRepository labTestRepo) {
        this.visitRepo = visitRepo;
        this.patientRepo = patientRepo;
        this.billRepo = billRepo;
        this.billItemRepo = billItemRepo;
        this.labTestRepo = labTestRepo;
    }

    public List<Visit> listVisits(Visit.Status status, String sort) {
        if (status != null) {
            List<Visit> list = visitRepo.findByStatusOrderByVisitDateDesc(status);
            return sortByPatientName(list, sort);
        }
        List<Visit> list = visitRepo.findAllByOrderByVisitDateDesc();
        return sortByPatientName(list, sort);
    }

    private List<Visit> sortByPatientName(List<Visit> list, String sort) {
        if (!"name".equalsIgnoreCase(sort)) {
            return list;
        }
        return list.stream()
                .sorted((a, b) -> {
                    String na = a.getPatient() != null ? a.getPatient().getName() : "";
                    String nb = b.getPatient() != null ? b.getPatient().getName() : "";
                    return na.compareToIgnoreCase(nb);
                })
                .toList();
    }

    public Optional<Visit> findVisit(Integer id) {
        return visitRepo.findById(id);
    }

    @Transactional
    public Visit createVisit(Integer existingPatientId, Patient newPatientDraft) {
        Patient patient;
        if (existingPatientId != null) {
            patient = patientRepo.findById(existingPatientId).orElseThrow();
        } else if (newPatientDraft != null) {
            if (newPatientDraft.getOpenBalance() == null) {
                newPatientDraft.setOpenBalance(Z);
            }
            patient = patientRepo.save(newPatientDraft);
        } else {
            throw new IllegalArgumentException("patient required");
        }

        Visit visit = Visit.builder()
                .patient(patient)
                .status(Visit.Status.DRAFTED)
                .currentQueue(Visit.VisitQueue.CASHIER)
                .visitDate(java.time.LocalDateTime.now())
                .build();
        visit = visitRepo.save(visit);

        Bill bill = Bill.builder()
                .visit(visit)
                .status(Bill.Status.DRAFTED)
                .totalAmount(Z)
                .openBalance(Z)
                .totalPaid(Z)
                .paidMobile(Z)
                .paidCash(Z)
                .paidCard(Z)
                .paidCheque(Z)
                .build();
        billRepo.save(bill);

        patient.recordNewVisit();
        patientRepo.save(patient);

        return visitRepo.findById(visit.getId()).orElseThrow();
    }

    @Transactional
    public BillItem addBillItem(int visitId, BillItem.ItemType itemType, int itemRefId,
                                String description, BigDecimal lineTotal, int quantity) {
        Bill bill = billRepo.findByVisit_Id(visitId).orElseThrow();
        BillItem line = BillItem.builder()
                .bill(bill)
                .itemType(itemType)
                .itemRefId(itemRefId)
                .description(description)
                .amount(lineTotal != null ? lineTotal : Z)
                .quantity(quantity > 0 ? quantity : 1)
                .build();
        billItemRepo.save(line);
        bill.setItemType(itemType.name());
        recalcBill(bill.getId());
        return line;
    }

    @Transactional
    public void deleteBillItem(Integer billItemId) {
        billItemRepo.findById(billItemId).ifPresent(item -> {
            Integer billId = item.getBill().getId();
            billItemRepo.delete(item);
            recalcBill(billId);
        });
    }

    @Transactional
    public void updateCashierNotes(int visitId, String notes) {
        Visit v = visitRepo.findById(visitId).orElseThrow();
        v.setNotes(notes);
        visitRepo.save(v);
    }

    @Transactional
    public void updateClinical(int visitId, String vitals, String diagnosis, String notes) {
        Visit v = visitRepo.findById(visitId).orElseThrow();
        v.setVitals(vitals);
        v.setDiagnosis(diagnosis);
        if (notes != null) {
            v.setNotes(notes);
        }
        visitRepo.save(v);
    }

    @Transactional
    public Visit forward(int visitId, Visit.VisitQueue queue) {
        Visit v = visitRepo.findById(visitId).orElseThrow();
        validateWorkflowTransition(v, queue);
        v.setCurrentQueue(queue);
        return visitRepo.save(v);
    }

    private void validateWorkflowTransition(Visit visit, Visit.VisitQueue targetQueue) {
        Visit.VisitQueue currentQueue = visit.getCurrentQueue();
        if (currentQueue == targetQueue) {
            return;
        }
        Set<Visit.VisitQueue> allowedTargets = switch (currentQueue) {
            case CASHIER -> Set.of(Visit.VisitQueue.CLINICIAN, Visit.VisitQueue.LAB);
            case CLINICIAN -> Set.of(Visit.VisitQueue.CASHIER);
            case LAB -> Set.of(Visit.VisitQueue.CLINICIAN);
        };
        if (!allowedTargets.contains(targetQueue)) {
            throw new IllegalStateException("Workflow transition not allowed: " + currentQueue + " -> " + targetQueue);
        }

        if (currentQueue == Visit.VisitQueue.CASHIER && targetQueue == Visit.VisitQueue.LAB) {
            Bill bill = billRepo.findByVisit_Id(visit.getId()).orElseThrow();
            if (bill.getOpenBalance() != null && bill.getOpenBalance().compareTo(Z) > 0) {
                throw new IllegalStateException("Lab tests require cashier billing clearance before forwarding to lab");
            }
            long pendingTests = labTestRepo.findByVisit_IdOrderByIdAsc(visit.getId()).stream()
                    .filter(t -> t.getStatus() == LabTest.Status.PENDING)
                    .count();
            if (pendingTests == 0) {
                throw new IllegalStateException("Order at least one pending lab test before forwarding to lab");
            }
        }
    }

    @Transactional
    public Visit complete(int visitId) {
        Visit v = visitRepo.findById(visitId).orElseThrow();
        v.setStatus(Visit.Status.COMPLETED);
        return visitRepo.save(v);
    }

    @Transactional
    public LabTest addLabTest(int visitId, String testName) {
        Visit v = visitRepo.findById(visitId).orElseThrow();
        LabTest t = LabTest.builder()
                .visit(v)
                .testName(testName)
                .status(LabTest.Status.PENDING)
                .build();
        return labTestRepo.save(t);
    }

    @Transactional
    public LabTest updateLabTest(Integer testId, String result, String referenceRange, String notes) {
        LabTest t = labTestRepo.findById(testId).orElseThrow();
        t.setResult(result);
        t.setReferenceRange(referenceRange);
        t.setNotes(notes);
        t.setStatus(LabTest.Status.COMPLETED);
        return labTestRepo.save(t);
    }

    @Transactional
    public void deleteLabTest(Integer testId) {
        labTestRepo.deleteById(testId);
    }

    @Transactional
    public Bill applyPayment(Integer visitId, BigDecimal mobile, BigDecimal cash,
                             BigDecimal card, BigDecimal cheque) {
        Bill bill = billRepo.findByVisit_Id(visitId).orElseThrow();
        bill.setPaidMobile(Optional.ofNullable(mobile).orElse(Z));
        bill.setPaidCash(Optional.ofNullable(cash).orElse(Z));
        bill.setPaidCard(Optional.ofNullable(card).orElse(Z));
        bill.setPaidCheque(Optional.ofNullable(cheque).orElse(Z));
        recalcBill(bill.getId());
        bill = billRepo.findById(bill.getId()).orElseThrow();
        if (bill.getOpenBalance() != null && bill.getOpenBalance().compareTo(Z) <= 0) {
            bill.setStatus(Bill.Status.COMPLETED);
            billRepo.save(bill);
        }
        return billRepo.findById(bill.getId()).orElseThrow();
    }

    @Transactional
    public Bill completeBillDraft(Integer visitId) {
        Bill bill = billRepo.findByVisit_Id(visitId).orElseThrow();
        bill.setStatus(Bill.Status.COMPLETED);
        return billRepo.save(bill);
    }

    private void recalcBill(Integer billId) {
        Bill bill = billRepo.findById(billId).orElseThrow();
        List<BillItem> items = billItemRepo.findByBill_Id(billId);
        BigDecimal sum = items.stream()
                .map(BillItem::getAmount)
                .reduce(Z, BigDecimal::add);
        bill.setTotalAmount(sum);
        BigDecimal paid = nz(bill.getPaidMobile())
                .add(nz(bill.getPaidCash()))
                .add(nz(bill.getPaidCard()))
                .add(nz(bill.getPaidCheque()));
        bill.setTotalPaid(paid);
        bill.setOpenBalance(sum.subtract(paid));
        billRepo.save(bill);

        Integer patientId = bill.getVisit().getPatient().getId();
        BigDecimal ob = billRepo.sumOpenBalanceForPatient(patientId);
        patientRepo.findById(patientId).ifPresent(p -> {
            p.setOpenBalance(ob != null ? ob : Z);
            patientRepo.save(p);
        });
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : Z;
    }

    public List<BillItem> billItemsForVisit(int visitId) {
        return billRepo.findByVisit_Id(visitId)
                .map(b -> billItemRepo.findByBill_Id(b.getId()))
                .orElse(List.of());
    }

    public List<LabTest> labTestsForVisit(int visitId) {
        return labTestRepo.findByVisit_IdOrderByIdAsc(visitId);
    }

    public Optional<Bill> billForVisit(int visitId) {
        return billRepo.findByVisit_Id(visitId);
    }
}
