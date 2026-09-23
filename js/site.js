(function () {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const root = location.pathname.split('/').includes('pages') ? '../' : '';
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const dateLabel = (date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
  const longDate = (date) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  const priceLabel = (price) => Number(price) === 0 ? 'Gratuito' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(price);
  const icon = (name) => {
    const paths = {
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  };
  function imageSrc(path) { return `${root}${path}`; }
  function eventHref(id) { return `${root}pages/evento.html?id=${encodeURIComponent(id)}`; }
  function mapHref(eventId) { return `${root}pages/mapa.html?id=${encodeURIComponent(eventId)}`; }
  function placeHref(placeId) { return `${root}pages/mapa.html?local=${encodeURIComponent(placeId)}`; }
  function distanceKm(a, b) {
    if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(Number.isFinite)) return null;
    const radians = (degrees) => degrees * Math.PI / 180;
    const deltaLat = radians(b.latitude - a.latitude);
    const deltaLon = radians(b.longitude - a.longitude);
    const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2;
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 10) / 10;
  }

  function eventCard(event) {
    return `<article class="event-card"><a class="event-card-link" href="${eventHref(event.id)}" aria-label="Ver detalhes de ${escapeHTML(event.nome)}">
      <div class="event-image"><img src="${imageSrc(escapeHTML(event.imagem))}" alt="Imagem ilustrativa de ${escapeHTML(event.nome)}" loading="lazy"/><span class="event-category">${escapeHTML(event.categoria)}</span></div>
      <div class="event-body"><span class="event-date">${icon('calendar')} ${escapeHTML(dateLabel(event.data))} · ${escapeHTML(event.horaInicial)}</span><h3>${escapeHTML(event.nome)}</h3><p class="event-location">${icon('pin')} ${escapeHTML(event.cidade)}, SC</p><div class="event-bottom"><strong>${priceLabel(event.preco)}</strong><span class="event-detail-link">Ver detalhes ${icon('arrow')}</span></div></div></a>
      <button class="favorite-button" type="button" data-favorite="${event.id}" data-event-name="${escapeHTML(event.nome)}">${icon('heart')}</button></article>`;
  }

  function readTheme() {
    try { return JSON.parse(localStorage.getItem('goup-tema')) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }
  function setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('goup-tema', JSON.stringify(next)); } catch { /* permanece nesta página */ }
    const toggle = $('.theme-toggle');
    if (toggle) { toggle.setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'); toggle.title = next === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'; }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = next === 'dark' ? '#111511' : '#f8f9f4';
    const label = $('#theme-label');
    if (label) label.textContent = next === 'dark' ? 'Escuro ativado' : 'Claro ativado';
  }
  function toast(message, error = false) {
    const region = $('#toast-region');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.textContent = message;
    region.append(node);
    window.setTimeout(() => node.remove(), 4300);
  }
  function closeMenu() {
    $('.main-nav')?.classList.remove('open');
    const button = $('.menu-toggle');
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('menu-open');
  }
  function navLink(label, path, currentPath) {
    const href = `${root}${path}`;
    const active = currentPath === path || (path === 'pages/minhas-viagens.html#favoritos' && currentPath === 'pages/minhas-viagens.html' && location.hash === '#favoritos');
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }
  function mountHeader() {
    const target = $('#site-header');
    if (!target) return;
    const user = window.GoUpAuth?.buscarUsuarioAtual();
    const currentPath = location.pathname.endsWith('/index.html') || location.pathname.endsWith('/') ? 'index.html' : `pages/${location.pathname.split('/').pop()}`;
    const links = [
      ['Início', 'index.html'], ['Explorar eventos', 'pages/eventos.html'], ['Mapa', 'pages/mapa.html'],
      ['Planejador', 'pages/planejador.html'], ['Planejador Premium', 'pages/planejador-premium.html'],
      ['Favoritos', 'pages/minhas-viagens.html#favoritos'], ['Minhas viagens', 'pages/minhas-viagens.html'], ['Perfil', 'pages/perfil.html']
    ];
    target.className = 'site-header';
    target.innerHTML = `<div class="container header-top"><a class="brand" href="${root}index.html" aria-label="GoUp Events, página inicial"><img class="brand-logo" src="${root}assets/images/logo-goup.jpg" alt="Logo GoUp Events" width="1254" height="1254"/></a><div class="header-actions"><button class="icon-button theme-toggle" type="button" aria-label="Alternar tema" title="Alternar tema"><svg class="icon theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.4A8.5 8.5 0 0 1 8.6 3.6 8.5 8.5 0 1 0 20.4 15.4Z"/></svg><svg class="icon theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg></button>${user ? `<a class="text-button auth-user-link" href="${root}pages/perfil.html">Olá, ${escapeHTML(user.nome.split(' ')[0])}</a><button class="text-button header-logout" type="button" data-logout>Sair</button>` : `<a class="text-button" href="${root}pages/login.html">Entrar</a>`}<button class="icon-button menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir menu"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div><nav class="main-nav container" id="main-nav" aria-label="Navegação principal">${links.map(([label, path]) => navLink(label, path, currentPath)).join('')}<a class="mobile-auth-link" href="${root}pages/login.html" ${user ? 'hidden' : ''}>Entrar</a><button class="mobile-auth-link" type="button" data-logout ${user ? '' : 'hidden'}>Sair</button></nav>`;
    setTheme(readTheme());
    $('.theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('.menu-toggle').addEventListener('click', () => {
      const opened = $('.menu-toggle').getAttribute('aria-expanded') === 'true';
      $('.main-nav').classList.toggle('open', !opened);
      $('.menu-toggle').setAttribute('aria-expanded', String(!opened));
      $('.menu-toggle').setAttribute('aria-label', opened ? 'Abrir menu' : 'Fechar menu');
      document.body.classList.toggle('menu-open', !opened);
    });
    target.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', () => {
      try { window.GoUpAuth?.fazerLogout(); location.href = `${root}index.html`; }
      catch (error) { toast(error.message || 'Não foi possível sair.', true); }
    }));
    target.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    document.addEventListener('click', (event) => { if (!event.target.closest('#site-header')) closeMenu(); });
    window.addEventListener('resize', () => { if (innerWidth > 760) closeMenu(); });
  }
  function mountFooter() {
    const target = $('#site-footer');
    if (!target) return;
    target.className = 'site-footer compact-footer';
    target.innerHTML = `<div class="container compact-footer-inner"><a class="brand" href="${root}index.html" aria-label="GoUp Events, página inicial"><img class="brand-logo" src="${root}assets/images/logo-goup.jpg" alt="Logo GoUp Events" width="1254" height="1254"/></a><p>Descubra o que fazer em Santa Catarina.</p><div><a href="${root}pages/eventos.html">Eventos</a><a href="${root}pages/mapa.html">Mapa</a><a href="${root}pages/planejador-premium.html">Premium</a></div><small>© ${new Date().getFullYear()} GoUp Events</small></div>`;
  }
  function init() {
    mountHeader();
    mountFooter();
    document.querySelectorAll('#current-year, [data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-coming-soon]');
      if (button) toast(`${button.dataset.comingSoon} estará disponível em uma próxima etapa.`);
    });
  }
  window.GoUpSite = { root, escapeHTML, normalize, dateLabel, longDate, priceLabel, icon, imageSrc, eventHref, mapHref, placeHref, distanceKm, eventCard, setTheme, toast, init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
