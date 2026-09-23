(function () {
  'use strict';
  const data = window.GoUpData;
  const ui = window.GoUpSite;
  const favorites = window.GoUpFavoritos;
  const $ = (selector) => document.querySelector(selector);
  const state = { query: '', category: '' };

  function renderCategories() {
    $('#category-grid').innerHTML = data.categorias.map((category) => `<button class="category-card" type="button" data-category="${ui.escapeHTML(category.id)}" aria-pressed="false" aria-label="Explorar ${ui.escapeHTML(category.label)}"><span class="category-icon tone-${ui.escapeHTML(category.tone)}"><svg class="icon" aria-hidden="true"><use href="#i-${ui.escapeHTML(category.icon)}"/></svg></span><strong>${ui.escapeHTML(category.label)}</strong><small>${ui.escapeHTML(category.subtitle)}</small><svg class="icon" aria-hidden="true"><use href="#i-arrow-up"/></svg></button>`).join('');
    document.querySelectorAll('.category-card').forEach((button) => button.addEventListener('click', () => {
      state.category = state.category === button.dataset.category ? '' : button.dataset.category;
      state.query = '';
      $('#search-input').value = '';
      renderEvents();
      $('#eventos').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  function renderEvents() {
    const matching = data.eventos.filter((event) => {
      const categoryMatch = !state.category || event.categoria === state.category;
      const searchText = ui.normalize([event.nome, event.descricao, event.categoria, event.cidade, event.endereco].join(' '));
      return categoryMatch && (!state.query || searchText.includes(ui.normalize(state.query)));
    });
    const visible = state.query || state.category ? matching : matching.filter((event) => event.destaque);
    $('#featured-grid').innerHTML = visible.map(ui.eventCard).join('');
    favorites.atualizarBotoesDeFavorito($('#featured-grid'));
    $('#empty-state').hidden = visible.length > 0;
    $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'evento' : 'eventos'}`;
    $('#clear-search').hidden = !state.query && !state.category;
    $('#active-filter').hidden = !state.query && !state.category;
    $('#active-filter').innerHTML = state.query || state.category ? `Exibindo resultados para <strong>${ui.escapeHTML(state.query || state.category)}</strong>` : '';
    document.querySelectorAll('.category-card').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
  }

  function renderNearby() {
    const nearby = [7, 1, 2].map((id) => data.eventos.find((event) => event.id === id)).filter(Boolean);
    $('#nearby-grid').innerHTML = nearby.map((event) => `<a class="nearby-card" href="${ui.eventHref(event.id)}" aria-label="Ver detalhes de ${ui.escapeHTML(event.nome)}"><img src="${ui.imageSrc(ui.escapeHTML(event.imagem))}" alt="Imagem ilustrativa de ${ui.escapeHTML(event.nome)}" loading="lazy"/><span><small>${ui.escapeHTML(ui.dateLabel(event.data))} · ${ui.escapeHTML(event.categoria)}</small><strong>${ui.escapeHTML(event.nome)}</strong><em>${ui.icon('pin')} ${ui.escapeHTML(event.cidade)}, SC</em></span>${ui.icon('arrow')}</a>`).join('');
  }

  function renderCities() {
    $('#city-grid').innerHTML = data.cidades.map((city) => `<article class="city-card"><img src="${ui.imageSrc(ui.escapeHTML(city.imagem))}" alt="Imagem ilustrativa para ${ui.escapeHTML(city.nome)}" loading="lazy"/><a href="pages/eventos.html?cidade=${encodeURIComponent(city.nome)}" aria-label="Ver eventos em ${ui.escapeHTML(city.nome)}"><span><small>${ui.escapeHTML(city.subtitulo)}</small><strong>${ui.escapeHTML(city.nome)}</strong></span><span class="city-arrow">${ui.icon('arrow')}</span></a></article>`).join('');
  }

  function search(value) {
    state.query = value.trim();
    state.category = '';
    renderEvents();
    $('#eventos').scrollIntoView({ behavior: 'smooth' });
  }
  function reset() {
    state.query = '';
    state.category = '';
    $('#search-input').value = '';
    renderEvents();
  }

  function init() {
    if (!data || !Array.isArray(data.eventos)) { ui.toast('Não foi possível carregar os eventos.', true); return; }
    renderCategories(); renderEvents(); renderNearby(); renderCities();
    $('#hero-search').addEventListener('submit', (event) => { event.preventDefault(); search($('#search-input').value); });
    document.querySelectorAll('.hero-suggestions button').forEach((button) => button.addEventListener('click', () => { $('#search-input').value = button.dataset.query; search(button.dataset.query); }));
    $('#clear-search').addEventListener('click', reset);
    $('#empty-reset').addEventListener('click', reset);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
