package com.example.hospital.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", unique = true, nullable = false)
    @JsonIgnore
    private Visit visit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id")
    private User cashier;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime billDate = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.DRAFTED;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    private String itemType;

    @Column(precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal paidMobile = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal paidCash = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal paidCard = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal paidCheque = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal totalPaid = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal openBalance = BigDecimal.ZERO;

    public enum Status {
        DRAFTED,
        COMPLETED
    }

    public Integer getVisitId() {
        return visit == null ? null : visit.getId();
    }
}
