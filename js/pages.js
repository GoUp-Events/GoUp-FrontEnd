(function () {
  'use strict';
  const data = window.GoUpData;
  const ui = window.GoUpSite;
  const fav = window.GoUpFavoritos;
  const routes = window.GoUpRoteiros;
  const $ = (selector) => document.querySelector(selector);
  const options = (items) => items.map((value) => `<option value="${ui.escapeHTML(value)}">${ui.escapeHTML(value)}</option>`).join('');
  const venues = () => data.locais.filter((place) => ['Restaurante', 'Bar', 'Café', 'Bar e restaurante'].includes(place.tipo));

  function mapBase(id, center, zoom) {
    const container = document.getElementById(id);
    if (!container) return null;
    if (!window.maplibregl || (typeof maplibregl.supported === 'function' && !maplibregl.supported())) {
      container.innerHTML = '<p class="map-fallback">O mapa interativo não está disponível. O endereço do evento continua disponível nesta página.</p>';
      return null;
    }
    const styles = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
    try {
      let theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const map = new maplibregl.Map({ container: id, style: styles[theme], center: [center[1], center[0]], zoom, attributionControl: true, renderWorldCopies: false, dragRotate: false });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      new MutationObserver(() => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        if (next !== theme) { theme = next; map.setStyle(styles[theme]); }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return map;
    } catch {
      container.innerHTML = '<p class="map-fallback">O mapa interativo não está disponível. O endereço do evento continua disponível nesta página.</p>';
      return null;
    }
  }

  function initEvents() {
    $('#filter-category').insertAdjacentHTML('beforeend', options(data.categorias.map((category) => category.id)));
    $('#filter-city').insertAdjacentHTML('beforeend', options(data.cidades.map((city) => city.nome)));
    const params = new URLSearchParams(location.search);
    $('#filter-city').value = params.get('cidade') || '';
    $('#filter-search').value = params.get('q') || '';
    function render() {
      const query = ui.normalize($('#filter-search').value);
      const category = $('#filter-category').value;
      const city = $('#filter-city').value;
      const date = $('#filter-date').value;
      const price = $('#filter-price').value;
      const sort = $('#filter-sort').value;
      const matching = data.eventos.filter((event) => {
        const text = ui.normalize([event.nome, event.descricao, event.cidade, event.categoria, event.endereco].join(' '));
        return (!query || text.includes(query)) && (!category || event.categoria === category) && (!city || event.cidade === city) && (!date || event.data >= date) && (!price || (price === 'free' ? event.preco === 0 : price === 'paid' ? event.preco > 0 : event.preco <= Number(price)));
      });
      matching.sort(sort === 'popular' ? (a, b) => b.popularidade - a.popularidade : sort === 'price' ? (a, b) => a.preco - b.preco : (a, b) => a.data.localeCompare(b.data));
      $('#events-grid').innerHTML = matching.map(ui.eventCard).join('');
      fav.atualizarBotoesDeFavorito($('#events-grid'));
      $('#event-count').textContent = `${matching.length} ${matching.length === 1 ? 'evento' : 'eventos'}`;
      $('#events-empty').hidden = matching.length > 0;
    }
    $('#event-filters').addEventListener('input', render);
    $('#event-filters').addEventListener('change', render);
    const reset = () => { $('#event-filters').reset(); render(); };
    $('#reset-filters').addEventListener('click', reset);
    $('#empty-reset').addEventListener('click', reset);
    render();
  }

  function initEventDetail() {
    const rawId = new URLSearchParams(location.search).get('id');
    const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
    const event = data.eventos.find((item) => item.id === id);
    if (!event) { $('#event-not-found').hidden = false; document.title = 'Evento não encontrado — GoUp Events'; return; }
    const place = data.locais.find((item) => item.id === event.local_id);
    document.title = `${event.nome} — GoUp Events`;
    $('#event-detail').innerHTML = `<a class="back-link" href="eventos.html">← Voltar aos eventos</a><div class="detail-hero"><div class="detail-cover"><img src="${ui.imageSrc(ui.escapeHTML(event.imagem))}" alt="Imagem ilustrativa de ${ui.escapeHTML(event.nome)}"/></div><div class="detail-intro"><span class="section-kicker">${ui.escapeHTML(event.categoria)}</span><h1>${ui.escapeHTML(event.nome)}</h1><p>${ui.escapeHTML(event.descricao)}</p><div class="detail-actions"><button class="btn btn-outline-favorite" type="button" data-favorite="${event.id}" data-event-name="${ui.escapeHTML(event.nome)}">${ui.icon('heart')}<span data-favorite-label>Salvar nos favoritos</span></button><a class="btn btn-lime" href="planejador.html?evento=${event.id}">Montar roteiro →</a></div></div></div><div class="detail-layout"><section class="detail-card"><span class="section-kicker">Informações do evento</span><h2>Prepare-se para viver</h2><dl class="detail-facts"><div><dt>Data e horário</dt><dd>${ui.escapeHTML(ui.longDate(event.data))}, ${ui.escapeHTML(event.horaInicial)}–${ui.escapeHTML(event.horaFinal)}</dd></div><div><dt>Preço</dt><dd>${ui.priceLabel(event.preco)}</dd></div><div><dt>Local</dt><dd>${ui.escapeHTML(place?.nome || event.endereco)}</dd></div><div><dt>Endereço</dt><dd>${ui.escapeHTML(event.endereco)}</dd></div><div><dt>Cidade</dt><dd>${ui.escapeHTML(event.cidade)}, SC</dd></div><div><dt>Organizador</dt><dd>${ui.escapeHTML(event.organizador)}</dd></div></dl><p class="page-note">Evento fictício para demonstração. Confirme detalhes antes de sair.</p></section><section class="detail-card"><span class="section-kicker">Onde acontece</span><h2>Localização</h2><div id="event-map" class="detail-map" role="region" aria-label="Mapa de ${ui.escapeHTML(event.nome)}"></div><p>${ui.icon('pin')} ${ui.escapeHTML(event.endereco)}, ${ui.escapeHTML(event.cidade)}</p><a class="inline-link" href="${ui.mapHref(event.id)}">Abrir no mapa completo →</a></section></div>`;
    fav.atualizarBotoesDeFavorito($('#event-detail'));
    const map = mapBase('event-map', [event.latitude, event.longitude], 14);
    if (map) new maplibregl.Marker({ color: '#a9dd35' }).setLngLat([event.longitude, event.latitude]).setPopup(new maplibregl.Popup({ offset: 18 }).setText(event.nome)).addTo(map);
    const related = data.eventos.filter((item) => item.id !== event.id).sort((a, b) => (b.categoria === event.categoria) - (a.categoria === event.categoria) || (b.cidade === event.cidade) - (a.cidade === event.cidade)).slice(0, 3);
    $('#related-grid').innerHTML = related.map(ui.eventCard).join('');
    fav.atualizarBotoesDeFavorito($('#related-grid'));
    $('#related-section').hidden = related.length === 0;
  }

  function initPlanner() {
    $('#planner-city').innerHTML = options(data.cidades.map((city) => city.nome));
    $('#planner-category').insertAdjacentHTML('beforeend', options(data.categorias.map((category) => category.id)));
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    $('#planner-date').min = localToday;
    $('#planner-date').value = localToday;
    let selectedRoute = null;
    const requestedId = Number(new URLSearchParams(location.search).get('evento'));
    const requestedEvent = data.eventos.find((event) => event.id === requestedId);
    if (requestedEvent) { $('#planner-city').value = requestedEvent.cidade; $('#planner-category').value = requestedEvent.categoria; $('#planner-date').value = requestedEvent.data; }
    $('#planner-form').addEventListener('submit', (submit) => {
      submit.preventDefault();
      const city = $('#planner-city').value;
      const date = $('#planner-date').value;
      const category = $('#planner-category').value;
      const budget = $('#planner-budget').value === '' ? Infinity : Number($('#planner-budget').value);
      const possible = data.eventos.filter((event) => event.cidade === city && event.data >= date && (!category || event.categoria === category) && event.preco <= budget).sort((a, b) => a.data.localeCompare(b.data));
      const event = requestedEvent && possible.some((item) => item.id === requestedEvent.id) ? requestedEvent : possible[0];
      if (!event) { selectedRoute = null; $('#planner-result').innerHTML = '<div class="planner-placeholder"><h2>Nenhum evento encontrado</h2><p>Tente outra data, categoria ou orçamento.</p></div>'; return; }
      const nearby = venues().filter((place) => place.cidade === city).sort((a, b) => (ui.distanceKm(event, a) ?? 999) - (ui.distanceKm(event, b) ?? 999));
      const place = nearby[0] || null;
      selectedRoute = { origem: 'manual', cidade: city, data: event.data, eventoId: event.id, localId: place?.id || null, distanciaKm: place ? ui.distanceKm(event, place) : null, horarioSugerido: event.horaFinal, descricao: `Roteiro em ${city} com ${event.nome}${place ? ` e ${place.nome}` : ''}.` };
      $('#planner-result').innerHTML = `<span class="section-kicker">Roteiro sugerido</span><h2>${ui.escapeHTML(city)}, do seu jeito</h2><div class="route-step"><b>01</b><div><strong>${ui.escapeHTML(event.nome)}</strong><small>${ui.escapeHTML(ui.longDate(event.data))} · ${ui.escapeHTML(event.horaInicial)} · ${ui.priceLabel(event.preco)}</small><a href="${ui.eventHref(event.id)}">Ver evento →</a></div></div>${place ? `<div class="route-step"><b>02</b><div><strong>${ui.escapeHTML(place.nome)}</strong><small>${ui.escapeHTML(place.tipo)} · ${selectedRoute.distanciaKm} km · ${ui.escapeHTML(place.faixaPreco || 'Preço a consultar')}</small><a href="${ui.placeHref(place.id)}">Abrir no mapa →</a></div></div>` : ''}<button class="btn btn-lime" id="planner-save" type="button">Salvar roteiro</button>`;
    });
    $('#planner-result').addEventListener('click', (event) => {
      if (!event.target.closest('#planner-save') || !selectedRoute) return;
      const saved = routes.salvarRoteiro(selectedRoute);
      if (saved) ui.toast('Roteiro salvo em Minhas viagens.'); else ui.toast('Não foi possível salvar o roteiro.', true);
    });
    if (requestedEvent) $('#planner-form').requestSubmit();
  }

  function initTrips() {
    function renderFavorites() {
      const ids = fav.obterFavoritos();
      const events = data.eventos.filter((event) => ids.includes(event.id));
      $('#favorites-grid').innerHTML = events.map(ui.eventCard).join('');
      fav.atualizarBotoesDeFavorito($('#favorites-grid'));
      $('#favorites-count').textContent = `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`;
      $('#favorites-empty').hidden = events.length > 0;
    }
    function renderRoutes() {
      const list = routes.buscarRoteiros();
      $('#routes-count').textContent = `${list.length} ${list.length === 1 ? 'roteiro' : 'roteiros'}`;
      $('#routes-empty').hidden = list.length > 0;
      $('#routes-list').innerHTML = list.map((route) => {
        const event = data.eventos.find((item) => item.id === Number(route.eventoId));
        const place = data.locais.find((item) => item.id === Number(route.localId));
        return `<article class="saved-route"><span class="section-kicker">${ui.escapeHTML(route.origem === 'premium' ? 'Planejador Premium' : 'Planejador GoUp')}</span><h3>${ui.escapeHTML(route.cidade || event?.cidade || 'Meu roteiro')}</h3><p>${ui.escapeHTML(event?.nome || route.descricao || 'Evento salvo')}${place ? ` + ${ui.escapeHTML(place.nome)}` : ''}</p><small>${route.data ? ui.escapeHTML(ui.longDate(route.data)) : 'Data a definir'}${route.distanciaKm != null ? ` · ${ui.escapeHTML(route.distanciaKm)} km` : ''}</small><div class="saved-route-actions">${event ? `<a class="inline-link" href="${ui.eventHref(event.id)}">Ver evento →</a>` : ''}${place ? `<a class="inline-link" href="${ui.placeHref(place.id)}">Abrir no mapa →</a>` : ''}<button type="button" data-remove-route="${ui.escapeHTML(route.id)}">Excluir roteiro</button></div></article>`;
      }).join('');
    }
    $('#routes-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-route]');
      if (!button) return;
      if (routes.removerRoteiro(button.dataset.removeRoute)) ui.toast('Roteiro excluído.'); else ui.toast('Não foi possível excluir o roteiro.', true);
    });
    window.addEventListener('goup:favoritos', renderFavorites);
    window.addEventListener('goup:roteiros', renderRoutes);
    renderFavorites(); renderRoutes();
  }

  function init() {
    if (!data || !ui) return;
    const page = document.body.dataset.page;
    if (page === 'eventos') initEvents();
    if (page === 'evento') initEventDetail();
    if (page === 'planejador') initPlanner();
    if (page === 'minhas-viagens') initTrips();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
