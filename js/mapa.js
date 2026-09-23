(function () {
  'use strict';

  const data = window.GoUpData;
  const ui = window.GoUpSite;
  const $ = (selector) => document.querySelector(selector);
  const styles = {
    light: 'https://tiles.openfreemap.org/styles/positron',
    dark: 'https://tiles.openfreemap.org/styles/dark'
  };
  const initialCenter = [-49.0661, -26.9194];
  const eventMarkers = new Map();
  const placeMarkers = new Map();
  let map = null;
  let userMarker = null;
  let activePopup = null;
  let selectedId = null;
  let visibleEvents = [];
  let currentStyle = null;
  let initialized = false;
  let mapLoaded = false;

  function validCoordinates(item) {
    return Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
      && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180;
  }

  function mostrarStatus(message, error = false) {
    const status = $('#map-status');
    status.textContent = message;
    status.classList.toggle('is-error', error);
    status.hidden = false;
  }

  function estiloAtual() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function carregarCamadaDoMapa() {
    const theme = estiloAtual();
    $('#map-theme').value = theme;
    if (!map || currentStyle === theme) return;
    currentStyle = theme;
    map.setStyle(styles[theme]);
  }

  function inicializarMapa() {
    if (initialized) return map;
    initialized = true;
    if (!window.maplibregl || (typeof maplibregl.supported === 'function' && !maplibregl.supported())) {
      $('#map').innerHTML = '<p class="map-fallback">O mapa interativo não está disponível neste navegador. Você ainda pode explorar os eventos na lista.</p>';
      $('#map-loading').hidden = true;
      mostrarStatus('O mapa interativo não pôde carregar neste navegador.', true);
      return null;
    }
    try {
      currentStyle = estiloAtual();
      map = new maplibregl.Map({
        container: 'map',
        style: styles[currentStyle],
        center: initialCenter,
        zoom: 9,
        minZoom: 5,
        maxZoom: 17,
        attributionControl: true,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const loadingTimer = window.setTimeout(() => {
        if (mapLoaded) return;
        $('#map-loading').textContent = 'Não foi possível carregar o mapa. Os eventos continuam disponíveis na lista.';
        $('#map-loading').classList.add('is-error');
        mostrarStatus('O serviço do mapa não respondeu. Tente atualizar a página.', true);
      }, 15000);
      map.on('load', () => {
        window.clearTimeout(loadingTimer);
        mapLoaded = true;
        $('#map-loading').hidden = true;
        if ($('#map-status').textContent === 'O serviço do mapa não respondeu. Tente atualizar a página.') $('#map-status').hidden = true;
        atualizarMapaPorFiltro();
      });
      return map;
    } catch (error) {
      map = null;
      $('#map').innerHTML = '<p class="map-fallback">O mapa interativo não está disponível. Você ainda pode explorar os eventos na lista.</p>';
      $('#map-loading').hidden = true;
      mostrarStatus('O mapa interativo não pôde carregar neste navegador.', true);
      return null;
    }
  }

  function limparMarcadores() {
    activePopup?.remove();
    activePopup = null;
    eventMarkers.forEach(({ marker }) => marker.remove());
    placeMarkers.forEach((marker) => marker.remove());
    eventMarkers.clear();
    placeMarkers.clear();
  }

  function conteudoPopupEvento(event) {
    return '<div class="goup-map-popup">'
      + `<img src="${ui.imageSrc(ui.escapeHTML(event.imagem))}" alt="Imagem de ${ui.escapeHTML(event.nome)}"/>`
      + `<span class="map-popup-category">${ui.escapeHTML(event.categoria)}</span>`
      + `<h3>${ui.escapeHTML(event.nome)}</h3>`
      + `<p>${ui.escapeHTML(event.cidade)} · ${ui.escapeHTML(ui.longDate(event.data))}<br/>${ui.escapeHTML(event.horaInicial)} · ${ui.priceLabel(event.preco)}</p>`
      + `<a href="${ui.eventHref(event.id)}">Ver detalhes →</a></div>`;
  }

  function renderizarMarcadores(events) {
    limparMarcadores();
    if (!map || !mapLoaded) return;
    events.forEach((event) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'goup-map-pin goup-map-pin-event';
      pin.setAttribute('aria-label', `Mostrar ${event.nome} no mapa`);
      pin.innerHTML = '<span aria-hidden="true">✦</span>';
      const marker = new maplibregl.Marker({ element: pin, anchor: 'bottom' })
        .setLngLat([event.longitude, event.latitude]).addTo(map);
      const popup = new maplibregl.Popup({ offset: 24, maxWidth: '290px', closeButton: true })
        .setLngLat([event.longitude, event.latitude]).setHTML(conteudoPopupEvento(event));
      pin.addEventListener('click', (click) => { click.stopPropagation(); centralizarNoEvento(event.id); });
      eventMarkers.set(event.id, { marker, popup });
    });

    if (!$('#map-show-places').checked) return;
    const city = $('#map-city').value;
    const category = $('#map-category').value;
    const eventCities = new Set(events.map((event) => event.cidade));
    data.locais.filter((place) => validCoordinates(place) && (!city || place.cidade === city)
      && (!category || eventCities.has(place.cidade))).forEach((place) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'goup-map-pin goup-map-pin-place';
      pin.setAttribute('aria-label', `Mostrar local ${place.nome}`);
      pin.innerHTML = '<span aria-hidden="true">●</span>';
      const marker = new maplibregl.Marker({ element: pin, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude]).addTo(map);
      const popup = new maplibregl.Popup({ offset: 18, maxWidth: '250px' })
        .setLngLat([place.longitude, place.latitude])
        .setHTML(`<div class="goup-map-popup"><span class="map-popup-category">LOCAL</span><h3>${ui.escapeHTML(place.nome)}</h3><p>${ui.escapeHTML(place.tipo)} · ${ui.escapeHTML(place.cidade)}</p></div>`);
      pin.addEventListener('click', (click) => {
        click.stopPropagation();
        activePopup?.remove();
        popup.addTo(map);
        activePopup = popup;
        map.easeTo({ center: [place.longitude, place.latitude], duration: 350 });
      });
      placeMarkers.set(place.id, marker);
    });
  }

  function renderizarListaEventos(events) {
    $('#map-count').textContent = `(${events.length})`;
    $('#map-event-list').innerHTML = events.map((event) => `<article class="map-event-card${selectedId === event.id ? ' is-selected' : ''}" data-event-id="${event.id}" tabindex="0" aria-label="Selecionar ${ui.escapeHTML(event.nome)} no mapa">
      <div class="map-event-card-top"><span class="map-event-category">${ui.escapeHTML(event.categoria)}</span><strong class="map-event-price">${ui.priceLabel(event.preco)}</strong></div>
      <h3>${ui.escapeHTML(event.nome)}</h3>
      <p>${ui.icon('pin')} ${ui.escapeHTML(event.cidade)}, SC</p>
      <p>${ui.icon('calendar')} ${ui.escapeHTML(ui.dateLabel(event.data))} · ${ui.escapeHTML(event.horaInicial)}</p>
      <div class="map-event-actions"><a href="${ui.eventHref(event.id)}">Ver detalhes →</a><button type="button" data-map-focus="${event.id}">Ver no mapa</button></div>
    </article>`).join('') || '<div class="map-list-empty"><strong>Nenhum evento encontrado</strong><p>Experimente outra cidade ou categoria.</p></div>';
  }

  function centralizarNoEvento(id) {
    id = Number(id);
    const event = visibleEvents.find((item) => item.id === id);
    const entry = eventMarkers.get(id);
    if (!map || !event || !entry) return false;
    selectedId = id;
    document.querySelectorAll('.map-event-card').forEach((card) => card.classList.toggle('is-selected', Number(card.dataset.eventId) === id));
    eventMarkers.forEach(({ marker }, markerId) => marker.getElement().classList.toggle('is-selected', markerId === id));
    activePopup?.remove();
    entry.popup.addTo(map);
    activePopup = entry.popup;
    map.easeTo({ center: [event.longitude, event.latitude], zoom: Math.max(map.getZoom(), 12.5), duration: 450 });
    return true;
  }

  function ajustarAosResultados(events) {
    if (!map || !mapLoaded || !events.length) return;
    if (events.length === 1) {
      map.jumpTo({ center: [events[0].longitude, events[0].latitude], zoom: 12 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    events.forEach((event) => bounds.extend([event.longitude, event.latitude]));
    map.fitBounds(bounds, { padding: 58, maxZoom: 11.5, duration: 0 });
  }

  function atualizarMapaPorFiltro() {
    const city = $('#map-city').value;
    const category = $('#map-category').value;
    const uniqueIds = new Set();
    visibleEvents = data.eventos.filter((event) => {
      if (!validCoordinates(event) || uniqueIds.has(event.id)) return false;
      uniqueIds.add(event.id);
      return (!city || event.cidade === city) && (!category || event.categoria === category);
    });
    if (!visibleEvents.some((event) => event.id === selectedId)) selectedId = null;
    renderizarListaEventos(visibleEvents);
    renderizarMarcadores(visibleEvents);
    ajustarAosResultados(visibleEvents);
    if (selectedId !== null) centralizarNoEvento(selectedId);
  }

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      mostrarStatus('Seu navegador não oferece geolocalização.', true);
      return;
    }
    mostrarStatus('Buscando sua localização...');
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      if (map) {
        userMarker?.remove();
        const pin = document.createElement('div');
        pin.className = 'goup-map-pin goup-map-pin-user';
        pin.setAttribute('aria-label', 'Você está aqui');
        pin.innerHTML = '<span aria-hidden="true">●</span>';
        userMarker = new maplibregl.Marker({ element: pin, anchor: 'bottom' })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText('Você está aqui'))
          .addTo(map);
        map.flyTo({ center: [longitude, latitude], zoom: 13, essential: true });
        userMarker.togglePopup();
      }
      mostrarStatus('Localização encontrada. Você está aqui.');
    }, (error) => {
      mostrarStatus(error.code === 1
        ? 'Permissão de localização negada. Você pode continuar explorando pelo mapa.'
        : 'Não foi possível obter sua localização. Tente novamente mais tarde.', true);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  function init() {
    if (!data || !ui) return;
    $('#map-city').insertAdjacentHTML('beforeend', data.cidades.map((city) => `<option value="${ui.escapeHTML(city.nome)}">${ui.escapeHTML(city.nome)}</option>`).join(''));
    $('#map-category').insertAdjacentHTML('beforeend', data.categorias.map((category) => `<option value="${ui.escapeHTML(category.id)}">${ui.escapeHTML(category.label)}</option>`).join(''));
    $('#map-theme').value = estiloAtual();
    const params = new URLSearchParams(location.search);
    const focusEventId = Number(params.get('id') || params.get('evento'));
    const focusPlaceId = Number(params.get('local'));
    const focusPlace = data.locais.find((place) => place.id === focusPlaceId && validCoordinates(place));
    if (focusPlace) $('#map-show-places').checked = true;

    $('#map-city').addEventListener('change', atualizarMapaPorFiltro);
    $('#map-category').addEventListener('change', atualizarMapaPorFiltro);
    $('#map-show-places').addEventListener('change', atualizarMapaPorFiltro);
    $('#map-theme').addEventListener('change', (event) => ui.setTheme(event.target.value));
    $('#use-location').addEventListener('click', usarMinhaLocalizacao);
    $('#map-event-list').addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      const id = event.target.closest('[data-map-focus]')?.dataset.mapFocus || event.target.closest('[data-event-id]')?.dataset.eventId;
      if (id) centralizarNoEvento(id);
    });
    $('#map-event-list').addEventListener('keydown', (event) => {
      if (event.target.matches('[data-event-id]') && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        centralizarNoEvento(event.target.dataset.eventId);
      }
    });
    new MutationObserver(carregarCamadaDoMapa).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    atualizarMapaPorFiltro();
    inicializarMapa();
    if (map) map.once('load', () => {
      if (eventMarkers.has(focusEventId)) centralizarNoEvento(focusEventId);
      else if (focusPlace && placeMarkers.has(focusPlaceId)) {
        const marker = placeMarkers.get(focusPlaceId);
        map.jumpTo({ center: [focusPlace.longitude, focusPlace.latitude], zoom: 13 });
        marker.getElement().click();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
