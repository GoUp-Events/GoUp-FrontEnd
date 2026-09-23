/* Dados demonstrativos. Atualize o catálogo do backend com: node backend/scripts/sync-catalog.mjs */
(function () {
  const today = new Date();
  const dateAfter = (days) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const categorias = [
    { id: 'Música', label: 'Música', icon: 'music', tone: 'pink', subtitle: 'Shows & festivais' },
    { id: 'Gastronomia', label: 'Gastronomia', icon: 'food', tone: 'orange', subtitle: 'Sabores & encontros' },
    { id: 'Natureza', label: 'Natureza', icon: 'nature', tone: 'lime', subtitle: 'Ar livre & trilhas' },
    { id: 'Cultura', label: 'Cultura', icon: 'culture', tone: 'lavender', subtitle: 'Arte & histórias' },
    { id: 'Festa', label: 'Festa', icon: 'party', tone: 'yellow', subtitle: 'Noites especiais' },
    { id: 'Esporte', label: 'Esporte', icon: 'sport', tone: 'blue', subtitle: 'Movimento & energia' },
    { id: 'Praia', label: 'Praia', icon: 'beach', tone: 'aqua', subtitle: 'Sol & mar' },
    { id: 'Cafés', label: 'Cafés', icon: 'coffee', tone: 'peach', subtitle: 'Pausas com sabor' }
  ];

  const cidades = [
    { nome: 'Blumenau', subtitulo: 'Cultura e encontros', imagem: 'assets/images/city-blumenau.jpg' },
    { nome: 'Florianópolis', subtitulo: 'Ilha de possibilidades', imagem: 'assets/images/city-florianopolis.jpg' },
    { nome: 'Pomerode', subtitulo: 'Charme em cada canto', imagem: 'assets/images/city-pomerode.jpg' },
    { nome: 'Balneário Piçarras', subtitulo: 'O mar te chama', imagem: 'assets/images/city-praia.jpg' },
    { nome: 'Itajaí', subtitulo: 'Energia que surpreende', imagem: 'assets/images/city-itajai.jpg' },
    { nome: 'Gaspar', subtitulo: 'Natureza por perto', imagem: 'assets/images/city-gaspar.jpg' }
  ];

  const locais = [
    { id: 1, nome: 'Centro de Blumenau', tipo: 'Espaço cultural', cidade: 'Blumenau', latitude: -26.9194, longitude: -49.0661 },
    { id: 2, nome: 'Vila Germânica', tipo: 'Casa de eventos', cidade: 'Blumenau', latitude: -26.9155, longitude: -49.0844 },
    { id: 3, nome: 'Centro de Gaspar', tipo: 'Espaço cultural', cidade: 'Gaspar', latitude: -26.9313, longitude: -48.9588 },
    { id: 4, nome: 'Orla de Balneário Piçarras', tipo: 'Praia', cidade: 'Balneário Piçarras', latitude: -26.7639, longitude: -48.6717 },
    { id: 5, nome: 'Centro de Itajaí', tipo: 'Espaço cultural', cidade: 'Itajaí', latitude: -26.9101, longitude: -48.6705 },
    { id: 6, nome: 'Centro de Pomerode', tipo: 'Espaço cultural', cidade: 'Pomerode', latitude: -26.7406, longitude: -49.1763 },
    { id: 7, nome: 'Lagoa da Conceição', tipo: 'Bar e restaurante', cidade: 'Florianópolis', latitude: -27.6034, longitude: -48.4664 },
    { id: 8, nome: 'Parque Ramiro Ruediger', tipo: 'Parque', cidade: 'Blumenau', latitude: -26.9158, longitude: -49.0781 },
    { id: 9, nome: 'Café do Centro', tipo: 'Café', cidade: 'Pomerode', latitude: -26.741, longitude: -49.174 },
    { id: 10, nome: 'Museu do Centro', tipo: 'Museu', cidade: 'Itajaí', latitude: -26.9079, longitude: -48.6615 },
    { id: 11, nome: 'Bistrô do Vale', tipo: 'Restaurante', cidade: 'Blumenau', endereco: 'Região da Vila Germânica, Blumenau - SC', latitude: -26.9167, longitude: -49.0815, avaliacao: 4.6, faixaPreco: 'R$ 35–65', imagem: 'assets/images/event-food.jpg' },
    { id: 12, nome: 'Bar da Praça', tipo: 'Bar', cidade: 'Blumenau', endereco: 'Centro, Blumenau - SC', latitude: -26.9185, longitude: -49.0701, avaliacao: 4.5, faixaPreco: 'R$ 25–50', imagem: 'assets/images/event-party.jpg' },
    { id: 13, nome: 'Cozinha do Vale', tipo: 'Restaurante', cidade: 'Gaspar', endereco: 'Centro, Gaspar - SC', latitude: -26.9317, longitude: -48.9597, avaliacao: 4.7, faixaPreco: 'R$ 30–60', imagem: 'assets/images/event-food.jpg' },
    { id: 14, nome: 'Café da Orla', tipo: 'Café', cidade: 'Balneário Piçarras', endereco: 'Orla Central, Balneário Piçarras - SC', latitude: -26.7649, longitude: -48.6726, avaliacao: 4.5, faixaPreco: 'R$ 20–40', imagem: 'assets/images/event-coffee.jpg' },
    { id: 15, nome: 'Mesa do Porto', tipo: 'Restaurante', cidade: 'Itajaí', endereco: 'Centro, Itajaí - SC', latitude: -26.9115, longitude: -48.6689, avaliacao: 4.6, faixaPreco: 'R$ 35–70', imagem: 'assets/images/event-food.jpg' },
    { id: 16, nome: 'Jardim Café', tipo: 'Café', cidade: 'Pomerode', endereco: 'Centro, Pomerode - SC', latitude: -26.7421, longitude: -49.1752, avaliacao: 4.8, faixaPreco: 'R$ 20–45', imagem: 'assets/images/event-coffee.jpg' },
    { id: 17, nome: 'Cozinha da Lagoa', tipo: 'Restaurante', cidade: 'Florianópolis', endereco: 'Lagoa da Conceição, Florianópolis - SC', latitude: -27.6019, longitude: -48.4660, avaliacao: 4.7, faixaPreco: 'R$ 40–75', imagem: 'assets/images/event-food.jpg' },
    { id: 18, nome: 'Bar da Lagoa', tipo: 'Bar', cidade: 'Florianópolis', endereco: 'Lagoa da Conceição, Florianópolis - SC', latitude: -27.6047, longitude: -48.4658, avaliacao: 4.5, faixaPreco: 'R$ 25–55', imagem: 'assets/images/event-party.jpg' }
  ];

  const eventos = [
    { id: 1, nome: 'Noite de Música na Vila', descricao: 'Uma noite para curtir música ao vivo, encontrar pessoas e aproveitar a energia da cidade. Evento fictício para demonstração.', categoria: 'Música', data: dateAfter(5), horaInicial: '19:00', horaFinal: '23:00', preco: 45, imagem: 'assets/images/event-music.jpg', cidade: 'Blumenau', endereco: 'Rua Alberto Stein, 199', latitude: -26.9155, longitude: -49.0844, local_id: 2, organizador: 'GoUp Experiências', capacidade: 800, popularidade: 98, destaque: true },
    { id: 2, nome: 'Sabores do Vale', descricao: 'Um encontro gastronômico para explorar novos sabores e compartilhar bons momentos. Evento fictício para demonstração.', categoria: 'Gastronomia', data: dateAfter(9), horaInicial: '11:00', horaFinal: '18:00', preco: 35, imagem: 'assets/images/event-food.jpg', cidade: 'Gaspar', endereco: 'Centro, Gaspar - SC', latitude: -26.9313, longitude: -48.9588, local_id: 3, organizador: 'Coletivo Sabores', capacidade: 350, popularidade: 91, destaque: true },
    { id: 3, nome: 'Pôr do Sol na Praia', descricao: 'Fim de tarde com música, mar e uma vista que merece ficar na memória. Evento fictício para demonstração.', categoria: 'Praia', data: dateAfter(12), horaInicial: '16:00', horaFinal: '20:00', preco: 0, imagem: 'assets/images/event-beach.jpg', cidade: 'Balneário Piçarras', endereco: 'Orla Central, Balneário Piçarras - SC', latitude: -26.7639, longitude: -48.6717, local_id: 4, organizador: 'GoUp Experiências', capacidade: 500, popularidade: 93, destaque: true },
    { id: 4, nome: 'Arte em Movimento', descricao: 'Um dia de arte, criatividade e novas perspectivas no coração de Itajaí. Evento fictício para demonstração.', categoria: 'Cultura', data: dateAfter(15), horaInicial: '14:00', horaFinal: '19:00', preco: 20, imagem: 'assets/images/event-culture.jpg', cidade: 'Itajaí', endereco: 'Centro, Itajaí - SC', latitude: -26.9101, longitude: -48.6705, local_id: 5, organizador: 'Coletivo Criar', capacidade: 250, popularidade: 89, destaque: true },
    { id: 5, nome: 'Caminhos de Pomerode', descricao: 'Um passeio leve por paisagens, cultura e sabores da cidade. Evento fictício para demonstração.', categoria: 'Natureza', data: dateAfter(7), horaInicial: '09:00', horaFinal: '13:00', preco: 25, imagem: 'assets/images/event-nature.jpg', cidade: 'Pomerode', endereco: 'Centro, Pomerode - SC', latitude: -26.7406, longitude: -49.1763, local_id: 6, organizador: 'Caminhos do Vale', capacidade: 40, popularidade: 84, destaque: false },
    { id: 6, nome: 'Festival da Lagoa', descricao: 'Música, boa comida e encontros à beira da Lagoa da Conceição. Evento fictício para demonstração.', categoria: 'Festa', data: dateAfter(18), horaInicial: '17:00', horaFinal: '23:30', preco: 60, imagem: 'assets/images/event-party.jpg', cidade: 'Florianópolis', endereco: 'Lagoa da Conceição, Florianópolis - SC', latitude: -27.6034, longitude: -48.4664, local_id: 7, organizador: 'Ilha Coletiva', capacidade: 600, popularidade: 95, destaque: false },
    { id: 7, nome: 'Manhã em Movimento', descricao: 'Uma manhã de esporte e encontro ao ar livre. Evento fictício para demonstração.', categoria: 'Esporte', data: dateAfter(3), horaInicial: '08:00', horaFinal: '11:00', preco: 0, imagem: 'assets/images/event-nature.jpg', cidade: 'Blumenau', endereco: 'Parque Ramiro Ruediger, Blumenau - SC', latitude: -26.9158, longitude: -49.0781, local_id: 8, organizador: 'Movimenta Blumenau', capacidade: 120, popularidade: 86, destaque: false },
    { id: 8, nome: 'Café e Conversas', descricao: 'Uma pausa para boas conversas, café especial e novas ideias. Evento fictício para demonstração.', categoria: 'Cafés', data: dateAfter(6), horaInicial: '15:00', horaFinal: '18:00', preco: 18, imagem: 'assets/images/event-coffee.jpg', cidade: 'Pomerode', endereco: 'Centro, Pomerode - SC', latitude: -26.741, longitude: -49.174, local_id: 9, organizador: 'Café do Centro', capacidade: 35, popularidade: 82, destaque: false },
    { id: 9, nome: 'Jazz no Centro', descricao: 'Uma noite intimista com jazz e encontros especiais. Evento fictício para demonstração.', categoria: 'Música', data: dateAfter(11), horaInicial: '20:00', horaFinal: '23:00', preco: 30, imagem: 'assets/images/event-music.jpg', cidade: 'Itajaí', endereco: 'Centro, Itajaí - SC', latitude: -26.9079, longitude: -48.6615, local_id: 10, organizador: 'Cena Cultural', capacidade: 180, popularidade: 88, destaque: false },
    { id: 10, nome: 'Sabores da Ilha', descricao: 'Um roteiro de sabores para descobrir Florianópolis. Evento fictício para demonstração.', categoria: 'Gastronomia', data: dateAfter(21), horaInicial: '12:00', horaFinal: '17:00', preco: 55, imagem: 'assets/images/event-food.jpg', cidade: 'Florianópolis', endereco: 'Lagoa da Conceição, Florianópolis - SC', latitude: -27.6034, longitude: -48.4664, local_id: 7, organizador: 'Sabores da Ilha', capacidade: 100, popularidade: 87, destaque: false }
  ];

  window.GoUpData = { categorias, cidades, locais, eventos };
})();
