package br.com.goup.premium;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/premium")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class PremiumChatController {
    private final PremiumChatService service;

    public PremiumChatController(PremiumChatService service) {
        this.service = service;
    }

    @PostMapping("/chat")
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return service.chat(request);
    }

    @ExceptionHandler(PremiumChatService.ChatFailure.class)
    public ResponseEntity<Map<String, String>> chatFailure(PremiumChatService.ChatFailure failure) {
        return ResponseEntity.status(failure.status()).body(Map.of("erro", failure.publicMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> unexpected(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("erro", "Não foi possível concluir sua solicitação."));
    }
}
