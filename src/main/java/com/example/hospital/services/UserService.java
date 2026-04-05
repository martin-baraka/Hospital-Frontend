package com.example.hospital.services;

import com.example.hospital.entities.User;
import com.example.hospital.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public void saveUser(User user) {
        String encodedPassword = passwordEncoder.encode(user.getPasswordHash());
        user.setPasswordHash(encodedPassword);
        userRepo.save(user);
    }

    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public Optional<User> getUserById(Integer id) {
        return userRepo.findById(id);
    }

    public boolean deleteUser(Integer targetUserId, String actingUsername) {
        return userRepo.findByUsername(actingUsername)
                .map(actingUser -> {
                    if (actingUser.getRole() == User.Role.ADMIN) {
                        userRepo.deleteById(targetUserId);
                        return true;
                    }
                    return false;
                }).orElse(false);
    }

    public boolean changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepo.findByUsername(username).orElse(null);
        if (user != null && passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepo.save(user);
            return true;
        }
        return false;
    }

    public Optional<User> findByUsername(String username) {
        return userRepo.findByUsername(username);
    }

    public void recordLogin(String username) {
        userRepo.findByUsername(username).ifPresent(u -> {
            u.setLastLoginAt(LocalDateTime.now());
            userRepo.save(u);
        });
    }

    public User adminCreateUser(String username, String oneTimePassword, User.Role role, boolean active) {
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(oneTimePassword);
        u.setRole(role);
        u.setStatus(active ? "ACTIVE" : "INACTIVE");
        saveUser(u);
        return userRepo.findByUsername(username).orElseThrow();
    }

    public void setUserActive(Integer userId, boolean active) {
        userRepo.findById(userId).ifPresent(u -> {
            u.setStatus(active ? "ACTIVE" : "INACTIVE");
            userRepo.save(u);
        });
    }

    public void adminResetPassword(Integer userId, String newRawPassword) {
        userRepo.findById(userId).ifPresent(u -> {
            u.setPasswordHash(passwordEncoder.encode(newRawPassword));
            userRepo.save(u);
        });
    }
}