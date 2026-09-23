package br.com.goup.premium;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class OpenAiClientTest {
    @Test
    void sendsKeyOnlyToProviderAndReadsStructuredResponse() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> body = new AtomicReference<>();
        server.createContext("/v1/responses", exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = """
                {"output":[{"type":"message","content":[{"type":"output_text",
                "text":"{\\\"resposta\\\":\\\"Olá!\\\",\\\"eventoIds\\\":[],\\\"localIds\\\":[],\\\"roteiroEventoId\\\":null,\\\"roteiroLocalId\\\":null,\\\"motivoRoteiro\\\":\\\"\\\",\\\"salvarRoteiro\\\":false}"}]}]}
                """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            OpenAiClient client = new OpenAiClient(mapper, "test-only-key", "gpt-4o-mini",
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/responses");
            JsonNode answer = client.responder("Responda em português.", List.of(), "Olá, o que você faz?");
            assertEquals("Olá!", answer.path("resposta").asText());
            assertEquals("Bearer test-only-key", authorization.get());
            JsonNode sent = mapper.readTree(body.get());
            assertFalse(sent.path("store").asBoolean(true));
            assertEquals("json_schema", sent.path("text").path("format").path("type").asText());
            assertEquals("user", sent.path("input").get(0).path("role").asText());
            assertFalse(body.get().contains("test-only-key"));
        } finally {
            server.stop(0);
        }
    }
}
