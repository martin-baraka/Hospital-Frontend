package com.example.hospital.controllers;

import com.example.hospital.entities.Product;
import com.example.hospital.entities.StockReceipt;
import com.example.hospital.entities.StockReceiptLine;
import com.example.hospital.entities.Supplier;
import com.example.hospital.entities.User;
import com.example.hospital.repositories.UserRepository;
import com.example.hospital.services.StockReceiptService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stock-receipts")
public class HmsStockReceiptController {

    private final StockReceiptService stockReceiptService;
    private final UserRepository userRepository;

    public HmsStockReceiptController(StockReceiptService stockReceiptService, UserRepository userRepository) {
        this.stockReceiptService = stockReceiptService;
        this.userRepository = userRepository;
    }

    private boolean admin(Authentication auth) {
        User u = userRepository.findByUsername(auth.getName()).orElseThrow();
        return u.getRole() == User.Role.ADMIN;
    }

    @GetMapping
    public ResponseEntity<List<StockReceipt>> list(Authentication auth) {
        if (!admin(auth)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(stockReceiptService.list());
    }

    @PostMapping
    public ResponseEntity<StockReceipt> create(Authentication auth, @RequestBody StockReceipt receipt) {
        if (!admin(auth)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(stockReceiptService.createReceipt(receipt));
    }

    public record GuidedReceiptLine(int productId, int quantityReceived, BigDecimal totalProductPrice) {}
    public record GuidedReceiptRequest(Integer supplierId, String dateReceived, String paymentMethod,
                                       BigDecimal totalPaymentAmount, BigDecimal paidAmount,
                                       List<GuidedReceiptLine> lines) {}

    @PostMapping("/guided")
    public ResponseEntity<StockReceipt> createGuidedReceipt(Authentication auth,
                                                            @RequestBody GuidedReceiptRequest request) {
        if (!admin(auth)) return ResponseEntity.status(403).build();
        if (request.supplierId() == null || request.lines() == null || request.lines().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        StockReceipt receipt = new StockReceipt();
        Supplier supplier = new Supplier();
        supplier.setId(request.supplierId());
        receipt.setSupplier(supplier);
        receipt.setDateReceived(request.dateReceived() != null ? java.time.LocalDate.parse(request.dateReceived()) : java.time.LocalDate.now());
        receipt.setPaymentMethod(request.paymentMethod() != null ? request.paymentMethod() : "CASH");
        receipt.setTotalPaymentAmount(request.totalPaymentAmount() != null ? request.totalPaymentAmount() : java.math.BigDecimal.ZERO);
        receipt.setPaidAmount(request.paidAmount() != null ? request.paidAmount() : java.math.BigDecimal.ZERO);
        receipt.setBalanceDue(receipt.getTotalPaymentAmount().subtract(receipt.getPaidAmount()));
        receipt.setLines(request.lines().stream().map(line -> {
            StockReceiptLine item = new StockReceiptLine();
            Product product = new Product();
            product.setId(line.productId());
            item.setProduct(product);
            item.setQuantityReceived(line.quantityReceived());
            item.setTotalProductPrice(line.totalProductPrice());
            item.setReceipt(receipt);
            return item;
        }).collect(Collectors.toList()));

        return ResponseEntity.ok(stockReceiptService.createReceipt(receipt));
    }
}
