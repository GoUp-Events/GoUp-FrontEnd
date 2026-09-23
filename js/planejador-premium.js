(function () {
  'use strict';
  const data = window.GoUpData;
  const ui = window.GoUpSite;
  const routes = window.GoUpRoteiros;
  const $ = (selector) => document.querySelector(selector);
  const HISTORY_KEY = 'goup-premium-historico-v2';
  const GREETING = 'Oi! Sou o planejador Premium do GoUp. Diga a cidade, o tipo de passeio ou seu orçamento para começarmos.';
  const MAX_HISTORY = 60;
  let messages = [];
  let currentRoute = null;
  let currentSavedId = null;
  let busy = false;
  let requestController = null;
  let conversationVersion = 0;
  class FriendlyError extends Error {}

  function greeting() {
    return { role: 'assistant', text: GREETING, time: new Date().toISOString(), source: 'greeting' };
  }
  function limitarHistorico(items) {
    return [items[0], ...items.slice(1).slice(-(MAX_HISTORY - 1))];
  }
  function readHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string').slice(-MAX_HISTORY);
    } catch { return []; }
  }
  function persist() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); return true; }
    catch { ui.toast('Não foi possível salvar o histórico neste navegador.', true); return false; }
  }
  function salvarMensagemNoHistorico(role, text, options = {}) {
    const item = { role, text, time: new Date().toISOString(), ...options };
    messages = limitarHistorico([...messages, item]);
    persist();
    renderHistory();
    return item;
  }
  function obterHistoricoDaConversa() {
    return messages.filter((item) => item.source !== 'greeting' && item.source !== 'error')
      .slice(-12)
      .map((item) => ({
        role: item.role,
        text: item.text.slice(0, 1000),
        eventoId: data.eventos.some((event) => event.id === Number(item.route?.eventoId)) ? Number(item.route.eventoId) : null
      }));
  }
  function eventById(id) {
    return data.eventos.find((item) => item.id === Number(id)) || null;
  }
  function placeById(id) {
    return data.locais.find((item) => item.id === Number(id)) || null;
  }
  function renderHistory() {
    const panel = $('#chat-history');
    panel.replaceChildren();
    messages.forEach((message) => {
      const item = document.createElement('article');
      item.className = `chat-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`;
      const label = document.createElement('span');
      label.className = 'message-label';
      label.textContent = message.role === 'user' ? 'Você' : 'GoUp Premium';
      const body = document.createElement('p');
      body.textContent = message.text;
      item.append(label, body);
      const eventIds = [...new Set([
        ...(Array.isArray(message.eventoIds) ? message.eventoIds : []),
        message.route?.eventoId
      ].map(Number).filter((id) => eventById(id)))];
      if (eventIds.length) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        eventIds.forEach((id) => {
          const event = eventById(id);
          const link = document.createElement('a');
          link.href = ui.eventHref(id);
          link.textContent = `Ver evento: ${event.nome} →`;
          actions.append(link);
        });
        const map = document.createElement('a');
        map.href = ui.mapHref(eventIds[0]);
        map.textContent = 'Abrir no mapa →';
        actions.append(map);
        item.append(actions);
      }
      panel.append(item);
    });
    panel.scrollTop = panel.scrollHeight;
  }
  function renderRoute(route, savedId = null) {
    const event = eventById(route?.eventoId);
    const place = placeById(route?.localId);
    currentRoute = event ? route : null;
    currentSavedId = event ? savedId : null;
    if (!event) {
      $('#route-preview').innerHTML = '<div class="route-empty"><span>✦</span><p>Converse com o planejador para receber uma sugestão de evento e lugar.</p></div>';
      $('#save-route').disabled = true;
      $('#save-route').textContent = 'Salvar roteiro';
      return;
    }
    const distance = place && Number.isFinite(Number(route.distanciaKm)) ? Number(route.distanciaKm).toFixed(1) : '—';
    $('#route-preview').innerHTML = `<div class="premium-route-event"><img src="${ui.imageSrc(ui.escapeHTML(event.imagem))}" alt="Imagem ilustrativa de ${ui.escapeHTML(event.nome)}"/><div><span class="route-overline">EVENTO ESCOLHIDO</span><h3>${ui.escapeHTML(event.nome)}</h3><p>${ui.escapeHTML(ui.longDate(event.data))} · ${ui.escapeHTML(event.horaInicial)}–${ui.escapeHTML(event.horaFinal)}<br/>${ui.escapeHTML(event.cidade)} · ${ui.priceLabel(event.preco)}</p><a href="${ui.eventHref(event.id)}">Ver evento →</a></div></div>${place ? `<div class="premium-route-place"><span class="route-overline">LOCAL RECOMENDADO</span><h3>${ui.escapeHTML(place.nome)}</h3><p>${ui.escapeHTML(place.tipo)} · ${ui.escapeHTML(place.cidade)}</p><div class="place-stats"><span>📍 ${distance} km</span><span>★ ${ui.escapeHTML(place.avaliacao ?? '—')}</span><span>${ui.escapeHTML(place.faixaPreco || 'Preço a consultar')}</span></div><small>Após ${ui.escapeHTML(event.horaFinal)}; confirme o horário de funcionamento do local.</small><a href="${ui.mapHref(event.id)}">Abrir no mapa →</a></div>` : ''}${route.motivo ? `<p class="route-reason">${ui.escapeHTML(route.motivo)}</p>` : ''}<div class="route-inline-actions"><a href="${ui.mapHref(event.id)}">Abrir evento no mapa</a><button type="button" data-save-route-inline ${savedId ? 'disabled' : ''}>${savedId ? 'Roteiro salvo' : 'Salvar roteiro'}</button></div>`;
    $('#save-route').disabled = Boolean(savedId);
    $('#save-route').textContent = savedId ? 'Salvo em Minhas viagens' : 'Salvar roteiro';
  }
  function saveCurrentRoute() {
    if (!currentRoute) { ui.toast('Converse com o planejador antes de salvar.', true); return; }
    if (currentSavedId) { ui.toast('Este roteiro já está salvo.'); return; }
    const saved = routes.salvarRoteiro(currentRoute);
    if (!saved) { ui.toast('Não foi possível salvar o roteiro.', true); return; }
    const message = [...messages].reverse().find((item) => item.route?.eventoId === currentRoute.eventoId);
    if (message) message.savedId = saved.id;
    persist();
    renderRoute(currentRoute, saved.id);
    ui.toast('Roteiro salvo em Minhas viagens.');
  }
  function apiUrl() {
    const configured = String(window.GOUP_API_BASE_URL || '').trim().replace(/\/$/, '');
    if (configured) return `${configured}/api/premium/chat`;
    if (['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '8080') {
      return 'http://127.0.0.1:8080/api/premium/chat';
    }
    return '/api/premium/chat';
  }
  async function enviarMensagemParaIA(mensagem, historico, signal) {
    const user = window.GoUpAuth?.buscarUsuarioAtual();
    let response;
    try {
      response = await fetch(apiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem,
          historico,
          usuarioId: user?.id || null,
          cidadeUsuario: user?.cidade || null
        }),
        signal
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new FriendlyError(navigator.onLine ? 'Não consegui falar com o planejador. Verifique se o backend está ligado.' : 'Você parece estar sem internet. Verifique sua conexão e tente novamente.');
    }
    if (!response.ok) {
      const errors = {
        400: 'Revise sua mensagem e tente novamente.',
        503: 'O planejador ainda não está configurado. Configure a chave da IA no backend.',
        502: 'O serviço de IA está indisponível no momento. Tente novamente em instantes.',
        504: 'A resposta demorou mais que o esperado. Tente novamente.'
      };
      throw new FriendlyError(errors[response.status] || 'Não consegui obter resposta do planejador agora. Tente novamente.');
    }
    let result;
    try { result = await response.json(); }
    catch { throw new FriendlyError('O planejador retornou uma resposta inválida. Tente novamente.'); }
    if (!result || typeof result.resposta !== 'string' || !result.resposta.trim()) {
      throw new FriendlyError('O planejador retornou uma resposta vazia. Tente novamente.');
    }
    return result;
  }
  function renderizarMensagemDaIA(result) {
    const validIds = (Array.isArray(result.eventos) ? result.eventos : [])
      .map((item) => Number(item?.id))
      .filter((id) => eventById(id));
    const event = eventById(result.roteiro?.eventoId);
    const place = placeById(result.roteiro?.localId);
    const route = event ? {
      origem: 'premium', cidade: event.cidade, data: event.data, eventoId: event.id,
      localId: place?.id || null, distanciaKm: place ? ui.distanceKm(event, place) : null,
      horarioSugerido: event.horaFinal,
      descricao: String(result.roteiro?.descricao || `Evento ${event.nome}${place ? ` e parada em ${place.nome}` : ''}.`).slice(0, 500),
      motivo: String(result.roteiro?.motivo || '').slice(0, 300)
    } : null;
    salvarMensagemNoHistorico('assistant', result.resposta.trim().slice(0, 4000), {
      eventoIds: validIds, route
    });
    if (route) renderRoute(route);
    if (result.salvarRoteiro === true && route) saveCurrentRoute();
  }
  function setBusy(value) {
    busy = value;
    $('#chat-input').disabled = value;
    $('#chat-form button').disabled = value;
    document.querySelectorAll('[data-prompt]').forEach((button) => { button.disabled = value; });
    $('#typing-indicator').hidden = !value;
    if (value) $('#chat-history').scrollTop = $('#chat-history').scrollHeight;
  }
  async function submitMessage(value) {
    const text = String(value || '').trim();
    if (!text || busy) return;
    const history = obterHistoricoDaConversa();
    const version = conversationVersion;
    requestController = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; requestController?.abort(); }, 30000);
    $('#chat-input').value = '';
    salvarMensagemNoHistorico('user', text);
    setBusy(true);
    try {
      const result = await enviarMensagemParaIA(text, history, requestController.signal);
      if (version === conversationVersion) renderizarMensagemDaIA(result);
    } catch (error) {
      if (version === conversationVersion) {
        const message = error.name === 'AbortError' && timedOut
          ? 'A resposta demorou mais que o esperado. Tente novamente.'
          : error instanceof FriendlyError ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
        salvarMensagemNoHistorico('assistant', message, { source: 'error' });
      }
    } finally {
      clearTimeout(timer);
      if (version === conversationVersion) {
        requestController = null;
        setBusy(false);
        $('#chat-input').focus();
      }
    }
  }
  function limparHistoricoDaConversa() {
    conversationVersion += 1;
    requestController?.abort();
    requestController = null;
    messages = [greeting()];
    currentRoute = null;
    currentSavedId = null;
    $('#chat-input').value = '';
    persist();
    renderHistory();
    renderRoute(null);
    setBusy(false);
    ui.toast('Conversa limpa.');
  }
  function init() {
    if (!data || !ui || !routes) return;
    const user = window.GoUpAuth?.buscarUsuarioAtual();
    if (user) $('#chat-user').textContent = `Olá, ${user.nome.split(' ')[0]}. Vamos planejar?`;
    messages = readHistory();
    if (!messages.length) { messages = [greeting()]; persist(); }
    renderHistory();
    const lastRouteMessage = [...messages].reverse().find((item) => eventById(item.route?.eventoId));
    if (lastRouteMessage) renderRoute(lastRouteMessage.route, lastRouteMessage.savedId || null);
    $('#chat-form').addEventListener('submit', (event) => {
      event.preventDefault();
      submitMessage($('#chat-input').value);
    });
    $('#chat-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        submitMessage(event.currentTarget.value);
      }
    });
    document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
    $('#clear-chat').addEventListener('click', limparHistoricoDaConversa);
    $('#save-route').addEventListener('click', saveCurrentRoute);
    $('#route-preview').addEventListener('click', (event) => {
      if (event.target.closest('[data-save-route-inline]')) saveCurrentRoute();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
