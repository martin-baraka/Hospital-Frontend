package com.example.hospital.config;

import com.example.hospital.entities.FacilitySettings;
import com.example.hospital.entities.User;
import com.example.hospital.repositories.FacilitySettingsRepository;
import com.example.hospital.services.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class DataSetup implements CommandLineRunner {

    private final UserService userService;
    private final FacilitySettingsRepository facilitySettingsRepository;

    public DataSetup(UserService userService, FacilitySettingsRepository facilitySettingsRepository) {
        this.userService = userService;
        this.facilitySettingsRepository = facilitySettingsRepository;
    }

    @Override
    public void run(String... args) {
        if (facilitySettingsRepository.findById(1).isEmpty()) {
            facilitySettingsRepository.save(FacilitySettings.builder()
                    .id(1)
                    .officialName("MediCore Hospital")
                    .phone("")
                    .county("")
                    .subcounty("")
                    .build());
        }

        ensureUser("admin", "admin123$", "ADMIN");
        ensureUser("cashier", "cashier123$", "CASHIER");
        ensureUser("clinician", "clinician123$", "CLINICIAN");
        ensureUser("lab", "lab123$", "LAB_TECHNICIAN");

        // Sample patient
        // if (patientRepository.count() == 0) {
        //     Patient patient = Patient.builder()
        //             .name("John Doe")
        //             .gender("Male")
        //             .phone("1234567890")
        //             .dob(LocalDate.of(1990, 1, 1))
        //             .numOfVisits(0)
        //             .openBalance(BigDecimal.ZERO)
        //             .build();
        //     patientRepository.save(patient);

        //     // Sample visit
        //     Visit visit = Visit.builder()
        //             .patient(patient)
        //             .visitDate(LocalDateTime.now())
        //             .status(Visit.Status.COMPLETED)
        //             .currentQueue(Visit.VisitQueue.LAB)
        //             .build();
        //     visitRepository.save(visit);
        // }
    }

    private void ensureUser(String username, String rawPassword, String roleName) {
        if (userService.findByUsername(username).isEmpty()) {
            User u = new User();
            u.setUsername(username);
            u.setPasswordHash(rawPassword);
            u.setRole(User.Role.valueOf(roleName));
            u.setStatus("ACTIVE");
            userService.saveUser(u);
            System.out.println("Seeded user: " + username + " / " + rawPassword);
        }
    }
}
