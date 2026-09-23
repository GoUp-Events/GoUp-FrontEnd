(function () {
  'use strict';
  const KEY = 'goup-favoritos';
  function obterFavoritos() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger))] : [];
    } catch { return []; }
  }
  function salvar(ids) {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); }
    catch { return false; }
    window.dispatchEvent(new CustomEvent('goup:favoritos', { detail: ids }));
    return true;
  }
  function eventoEstaFavoritado(id) { return obterFavoritos().includes(Number(id)); }
  function adicionarFavorito(id) {
    id = Number(id);
    if (!Number.isInteger(id) || !window.GoUpData?.eventos.some((item) => item.id === id)) return false;
    return salvar([...new Set([...obterFavoritos(), id])]);
  }
  function removerFavorito(id) { return salvar(obterFavoritos().filter((saved) => saved !== Number(id))); }
  function atualizarBotoesDeFavorito(root = document) {
    root.querySelectorAll('[data-favorite]').forEach((button) => {
      const saved = eventoEstaFavoritado(button.dataset.favorite);
      const name = button.dataset.eventName || 'evento';
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}: ${name}`);
      button.title = saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
      const label = button.querySelector('[data-favorite-label]');
      if (label) label.textContent = saved ? 'Remover dos favoritos' : 'Salvar nos favoritos';
    });
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const id = Number(button.dataset.favorite);
    const saved = eventoEstaFavoritado(id);
    const success = saved ? removerFavorito(id) : adicionarFavorito(id);
    if (!success) { window.GoUpSite?.toast('Não foi possível salvar o favorito neste navegador.', true); return; }
    atualizarBotoesDeFavorito();
    window.GoUpSite?.toast(saved ? 'Evento removido dos favoritos.' : 'Evento adicionado aos favoritos.');
  });
  window.addEventListener('storage', (event) => { if (event.key === KEY) atualizarBotoesDeFavorito(); });
  window.GoUpFavoritos = { obterFavoritos, adicionarFavorito, removerFavorito, eventoEstaFavoritado, atualizarBotoesDeFavorito };
})();
