package com.example.hospital.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "expense_date")
    private LocalDate expenseDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "supplier_name")
    @Builder.Default
    private String supplierName = "N/A";

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "amount_paid", precision = 14, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "expense_status")
    @Builder.Default
    private String expenseStatus = "RECORDED";

    @Column(name = "category", length = 512)
    private String category;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (expenseDate == null) {
            expenseDate = LocalDate.now();
        }
    }
}
