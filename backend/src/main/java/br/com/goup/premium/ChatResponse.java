package br.com.goup.premium;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;

public record ChatResponse(String resposta, List<ObjectNode> eventos, List<ObjectNode> locais,
                           ObjectNode roteiro, boolean salvarRoteiro) {}
