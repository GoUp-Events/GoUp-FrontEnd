package br.com.goup.premium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class CatalogoGoUp {
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final Pattern LIMITE_PRECO = Pattern.compile("(?:ate|menos de)\\s*(?:r\\$\\s*)?(\\d{1,4})");
    private final List<ObjectNode> eventos;
    private final List<ObjectNode> locais;

    public record Contexto(List<ObjectNode> eventos, List<ObjectNode> locais, String cidade,
                           LocalDate hoje, Integer ultimoEventoId) {}

    public CatalogoGoUp(ObjectMapper mapper) throws IOException {
        try (InputStream source = getClass().getResourceAsStream("/catalogo.json")) {
            if (source == null) throw new IOException("Catálogo não encontrado");
            JsonNode data = mapper.readTree(source);
            eventos = new ArrayList<>();
            locais = new ArrayList<>();
            data.path("eventos").forEach(item -> eventos.add((ObjectNode) item));
            data.path("locais").forEach(item -> locais.add((ObjectNode) item));
        }
    }

    public static String normalize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}+", "").toLowerCase().trim();
    }

    private String cidadeMencionada(String text) {
        for (String cidade : List.of("Balneário Piçarras", "Florianópolis", "Blumenau", "Gaspar", "Itajaí", "Pomerode")) {
            if (normalize(text).contains(normalize(cidade))) return cidade;
        }
        return null;
    }

    public Contexto selecionar(ChatRequest request) {
        String pergunta = normalize(request.mensagem());
        String cidade = cidadeMencionada(request.mensagem());
        Integer ultimoEventoId = null;
        if (cidade == null && request.historico() != null) {
            for (int index = request.historico().size() - 1; index >= 0; index--) {
                ChatRequest.MensagemChat item = request.historico().get(index);
                if (ultimoEventoId == null && item != null && item.eventoId() != null
                        && eventos.stream().anyMatch(event -> event.path("id").asInt() == item.eventoId())) {
                    ultimoEventoId = item.eventoId();
                }
                if (item != null && "user".equals(item.role())) {
                    cidade = cidadeMencionada(item.text());
                    if (cidade != null) break;
                }
            }
        }
        if (cidade == null && ultimoEventoId != null) {
            final int reference = ultimoEventoId;
            cidade = eventos.stream().filter(event -> event.path("id").asInt() == reference)
                    .findFirst().map(event -> event.path("cidade").asText()).orElse(null);
        }
        if (cidade == null && normalize(pertoDeMim(pergunta)).equals("sim")) {
            cidade = cidadeMencionada(request.cidadeUsuario());
        }
        String category = null;
        if (pergunta.matches(".*(festa|balada).*")) category = "Festa";
        else if (pergunta.matches(".*(show|musica|jazz).*")) category = "Música";
        else if (pergunta.matches(".*(natureza|ar livre|trilha|passeio).*")) category = "Natureza";
        else if (pergunta.matches(".*(cultura|arte|museu).*")) category = "Cultura";
        else if (pergunta.matches(".*(praia|mar).*")) category = "Praia";
        boolean today = pergunta.matches(".*\\bhoje\\b.*");
        boolean tomorrow = pergunta.matches(".*\\bamanha\\b.*");
        Matcher priceMatch = LIMITE_PRECO.matcher(pergunta);
        Integer maximum = priceMatch.find() ? Integer.parseInt(priceMatch.group(1)) : null;
        if (maximum == null && pergunta.matches(".*(barato|economico).*")) maximum = 50;
        if (pergunta.matches(".*(gratis|gratuito).*")) maximum = 0;
        LocalDate now = LocalDate.now(FUSO);
        final String selectedCity = cidade;
        final String selectedCategory = category;
        final Integer maximumPrice = maximum;
        List<ObjectNode> matches = eventos.stream().map(event -> {
            ObjectNode copy = event.deepCopy();
            copy.remove("diasAposHoje");
            LocalDate date = now.plusDays(event.path("diasAposHoje").asInt());
            copy.put("data", date.toString());
            copy.put("diaSemana", date.format(DateTimeFormatter.ofPattern("EEEE", Locale.forLanguageTag("pt-BR"))));
            return copy;
        }).filter(event -> selectedCity == null || selectedCity.equals(event.path("cidade").asText()))
          .filter(event -> !today || now.toString().equals(event.path("data").asText()))
          .filter(event -> !tomorrow || now.plusDays(1).toString().equals(event.path("data").asText()))
          .filter(event -> maximumPrice == null || event.path("preco").asInt() <= maximumPrice)
          .filter(event -> selectedCategory == null || selectedCategory.equals(event.path("categoria").asText())
                   || ("Natureza".equals(selectedCategory) && List.of("Praia", "Esporte").contains(event.path("categoria").asText())))
          .sorted(Comparator.comparing(event -> event.path("data").asText()))
          .limit(8).toList();
        Set<String> selectedCities = new HashSet<>();
        if (cidade != null) selectedCities.add(cidade);
        else matches.forEach(event -> selectedCities.add(event.path("cidade").asText()));
        boolean wantsFood = pergunta.matches(".*(comer|restaurante|jantar|almoc|gastronomia).*");
        boolean wantsBar = pergunta.matches(".*(\\bbar\\b|bebida|cerveja).*");
        boolean wantsPlace = wantsFood || wantsBar || pergunta.matches(".*(local|lugar|depois).*");
        List<ObjectNode> places = locais.stream()
            .filter(place -> selectedCities.isEmpty() || selectedCities.contains(place.path("cidade").asText()))
            .filter(place -> !wantsFood || List.of("Restaurante", "Bar e restaurante", "Café").contains(place.path("tipo").asText()))
            .filter(place -> !wantsBar || List.of("Bar", "Bar e restaurante").contains(place.path("tipo").asText()))
            .filter(place -> maximumPrice == null || upperPrice(place) <= maximumPrice)
            .filter(place -> wantsPlace || place.path("id").asInt() >= 11)
            .limit(8).map(ObjectNode::deepCopy).toList();
        return new Contexto(matches, places, cidade, now, ultimoEventoId);
    }

    private String pertoDeMim(String text) {
        return text.matches(".*(perto de mim|proximo de mim|na minha cidade).*") ? "sim" : "nao";
    }

    private int upperPrice(JsonNode place) {
        Matcher values = Pattern.compile("\\d+").matcher(place.path("faixaPreco").asText(""));
        int maximum = Integer.MAX_VALUE;
        while (values.find()) maximum = Integer.parseInt(values.group());
        return maximum;
    }

    public ObjectNode eventoPorId(Contexto context, int id) {
        return context.eventos().stream().filter(event -> event.path("id").asInt() == id).findFirst().orElse(null);
    }

    public ObjectNode localPorId(Contexto context, int id) {
        return context.locais().stream().filter(local -> local.path("id").asInt() == id).findFirst().orElse(null);
    }

    public static Double distanceKm(JsonNode a, JsonNode b) {
        if (!a.has("latitude") || !a.has("longitude") || !b.has("latitude") || !b.has("longitude")) return null;
        double lat1 = Math.toRadians(a.path("latitude").asDouble());
        double lat2 = Math.toRadians(b.path("latitude").asDouble());
        double dLat = lat2 - lat1;
        double dLon = Math.toRadians(b.path("longitude").asDouble() - a.path("longitude").asDouble());
        double h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLon / 2), 2);
        return Math.round(6371.0 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 10.0) / 10.0;
    }
}
