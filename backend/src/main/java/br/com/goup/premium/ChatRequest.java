package br.com.goup.premium;

import java.util.List;

public record ChatRequest(String mensagem, List<MensagemChat> historico, String usuarioId, String cidadeUsuario) {
    public record MensagemChat(String role, String text, Integer eventoId) {}
}
