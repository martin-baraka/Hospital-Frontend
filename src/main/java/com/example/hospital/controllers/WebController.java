package com.example.hospital.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    @GetMapping("/")
    public String home() {
        return "redirect:/hms";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/login.html")
    public String loginHtmlAlias() {
        return "redirect:/login";
    }

    @GetMapping("/hms")
    public String hmsApp() {
        return "hms";
    }

    @GetMapping({"/app", "/app.html"})
    public String appAlias() {
        return "redirect:/hms";
    }
}
