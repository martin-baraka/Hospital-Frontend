package com.example.hospital.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    private String gender;

    @Column(name = "last_visit")
    private LocalDateTime lastVisit;

    @Column(name = "num_of_visits")
    @Builder.Default
    private Integer numOfVisits = 0;

    private LocalDate dob;

    private String phone;

    private String address;

    @Column(name = "registration_date")
    private LocalDateTime registrationDate;

    @Column(name = "open_balance", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal openBalance = BigDecimal.ZERO;

    @PrePersist
    protected void onCreate() {
        if (this.registrationDate == null) {
            this.registrationDate = LocalDateTime.now();
        }
        if (this.openBalance == null) {
            this.openBalance = BigDecimal.ZERO;
        }
    }

    public void recordNewVisit() {
        this.lastVisit = LocalDateTime.now();
        if (this.numOfVisits == null) {
            this.numOfVisits = 1;
        } else {
            this.numOfVisits++;
        }
    }
}
