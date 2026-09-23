package br.com.goup.premium;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PremiumChatServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private CatalogoGoUp catalogo;
    private OpenAiClient ai;
    private PremiumChatService service;

    @BeforeEach
    void setUp() throws IOException {
        catalogo = new CatalogoGoUp(mapper);
        ai = mock(OpenAiClient.class);
        service = new PremiumChatService(catalogo, ai, mapper);
    }

    @Test
    void filtersTodayAndUnsupportedCityCategoryWithoutCallingAi() {
        ChatResponse today = service.chat(new ChatRequest("Quero algo barato hoje", List.of(), null, null));
        assertTrue(today.resposta().contains("Não encontrei uma opção compatível"));
        ChatResponse festa = service.chat(new ChatRequest("Tem alguma festa em Itajaí?", List.of(), null, null));
        assertTrue(festa.eventos().isEmpty());
        verifyNoInteractions(ai);
    }

    @Test
    void validatesModelIdsAndBuildsRouteFromCatalog() throws Exception {
        when(ai.responder(anyString(), any(), anyString())).thenReturn(mapper.readTree("""
            {"resposta":"Você pode aproveitar um evento em Pomerode.",
             "eventoIds":[5,9999],"localIds":[16,9999],
             "roteiroEventoId":5,"roteiroLocalId":16,
             "motivoRoteiro":"Passeio e café na mesma cidade.","salvarRoteiro":false}
            """));
        ChatResponse response = service.chat(new ChatRequest("Monte um roteiro em Pomerode", List.of(), null, null));
        assertEquals(1, response.eventos().size());
        assertEquals(5, response.eventos().get(0).path("id").asInt());
        assertEquals(16, response.roteiro().path("localId").asInt());
        assertTrue(response.roteiro().path("distanciaKm").asDouble() >= 0);
        assertEquals(response.eventos().get(0).path("preco").asInt(),
                response.roteiro().path("precoEvento").asInt());
    }

    @Test
    void retainsCityAndEventReferenceAcrossFollowUp() throws Exception {
        when(ai.responder(anyString(), any(), anyString())).thenReturn(mapper.readTree("""
            {"resposta":"O preço do evento está no catálogo.","eventoIds":[5],"localIds":[],
             "roteiroEventoId":null,"roteiroLocalId":null,"motivoRoteiro":"","salvarRoteiro":false}
            """));
        List<ChatRequest.MensagemChat> history = List.of(
                new ChatRequest.MensagemChat("user", "Quero um roteiro em Pomerode", null),
                new ChatRequest.MensagemChat("assistant", "Sugiro Caminhos de Pomerode.", 5));
        ChatResponse response = service.chat(new ChatRequest("Quanto custa essa opção?", history, null, null));
        assertEquals(5, response.eventos().get(0).path("id").asInt());
        verify(ai).responder(contains("Último evento indicado na conversa: 5"), any(), eq("Quanto custa essa opção?"));
    }

    @Test
    void acceptsSaveCommandOnlyWithAValidatedRoute() throws Exception {
        when(ai.responder(anyString(), any(), anyString())).thenReturn(mapper.readTree("""
            {"resposta":"Roteiro pronto para salvar.","eventoIds":[5],"localIds":[],
             "roteiroEventoId":5,"roteiroLocalId":null,"motivoRoteiro":"","salvarRoteiro":true}
            """));
        ChatResponse ordinary = service.chat(new ChatRequest("Monte um roteiro em Pomerode", List.of(), null, null));
        assertFalse(ordinary.salvarRoteiro());
        ChatResponse save = service.chat(new ChatRequest("Salve esse roteiro",
                List.of(new ChatRequest.MensagemChat("assistant", "Caminhos de Pomerode", 5)), null, null));
        assertTrue(save.salvarRoteiro());
    }

    @Test
    void asksForCityWhenLocationIsUnavailable() {
        ChatResponse response = service.chat(new ChatRequest("Encontre um evento perto de mim", List.of(), null, null));
        assertTrue(response.resposta().contains("diga sua cidade"));
        verifyNoInteractions(ai);
    }
}
