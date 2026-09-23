package br.com.goup.premium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class OpenAiClient {
    private static final String FORMAT = """
        {
          "type": "json_schema",
          "name": "goup_chat",
          "strict": true,
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "resposta": {"type": "string"},
              "eventoIds": {"type": "array", "items": {"type": "integer"}},
              "localIds": {"type": "array", "items": {"type": "integer"}},
              "roteiroEventoId": {"type": ["integer", "null"]},
              "roteiroLocalId": {"type": ["integer", "null"]},
              "motivoRoteiro": {"type": "string"},
              "salvarRoteiro": {"type": "boolean"}
            },
            "required": ["resposta", "eventoIds", "localIds", "roteiroEventoId", "roteiroLocalId", "motivoRoteiro", "salvarRoteiro"]
          }
        }
        """;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final String key;
    private final String model;
    private final URI url;

    public OpenAiClient(ObjectMapper mapper,
                        @Value("${ai.api-key:}") String key,
                        @Value("${ai.model:gpt-4o-mini}") String model,
                        @Value("${ai.responses-url:https://api.openai.com/v1/responses}") String url) {
        this.mapper = mapper;
        this.key = key;
        this.model = model;
        this.url = URI.create(url);
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public JsonNode responder(String instructions, List<ChatRequest.MensagemChat> history, String question) {
        if (key.isBlank()) {
            throw new PremiumChatService.ChatFailure(HttpStatus.SERVICE_UNAVAILABLE,
                    "A chave da IA não está configurada no backend.");
        }
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            body.put("instructions", instructions);
            body.put("store", false);
            body.put("max_output_tokens", 650);
            ArrayNode input = body.putArray("input");
            for (ChatRequest.MensagemChat item : history) {
                ObjectNode entry = input.addObject();
                entry.put("role", item.role());
                entry.put("content", item.text());
            }
            ObjectNode latest = input.addObject();
            latest.put("role", "user");
            latest.put("content", question);
            body.putObject("text").set("format", mapper.readTree(FORMAT));
            HttpRequest request = HttpRequest.newBuilder(url)
                .timeout(Duration.ofSeconds(23))
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 500 || response.statusCode() == 429) {
                throw new PremiumChatService.ChatFailure(HttpStatus.BAD_GATEWAY,
                        "O serviço de IA está indisponível. Tente novamente.");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new PremiumChatService.ChatFailure(HttpStatus.BAD_GATEWAY,
                        "O serviço de IA não pôde responder.");
            }
            JsonNode envelope = mapper.readTree(response.body());
            for (JsonNode output : envelope.path("output")) {
                for (JsonNode content : output.path("content")) {
                    if ("output_text".equals(content.path("type").asText())) {
                        return mapper.readTree(content.path("text").asText());
                    }
                }
            }
            throw new PremiumChatService.ChatFailure(HttpStatus.BAD_GATEWAY,
                    "A IA retornou uma resposta vazia.");
        } catch (HttpTimeoutException exception) {
            throw new PremiumChatService.ChatFailure(HttpStatus.GATEWAY_TIMEOUT,
                    "A resposta da IA demorou mais que o esperado.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PremiumChatService.ChatFailure(HttpStatus.BAD_GATEWAY,
                    "O serviço de IA está indisponível.");
        } catch (IOException exception) {
            throw new PremiumChatService.ChatFailure(HttpStatus.BAD_GATEWAY,
                    "Não foi possível acessar o serviço de IA.");
        }
    }
}
