package com.example.hospital.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "visits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "visit_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clinician_id")
    private User clinician;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime visitDate = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.DRAFTED;

    /** Current station in the workflow */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VisitQueue currentQueue = VisitQueue.CASHIER;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String vitals;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    public enum Status {
        DRAFTED,
        COMPLETED
    }

    public enum VisitQueue {
        CASHIER,
        CLINICIAN,
        LAB
    }
}
