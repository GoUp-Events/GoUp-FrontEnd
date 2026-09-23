# GoUp Events

Frontend em HTML, CSS e JavaScript puro com API Spring Boot para o Planejador Premium. Eventos e locais são fictícios e vêm de `js/dados.js`. A API conversa com a OpenAI usando uma chave configurada somente no backend. Sem essa chave, o chat mostra um aviso e não usa respostas simuladas.

## Executar com Live Server

1. Abra esta pasta no VS Code.
2. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
3. Navegue pelos links do header. As páginas internas ficam em `pages/` e devem ser abertas pelo servidor, usando a mesma origem.

O frontend não exige instalação nem build. Para usar o Premium, inicie também o backend abaixo. O mapa usa MapLibre GL JS com estilos claro e escuro do OpenFreeMap; a biblioteca e o mapa precisam de conexão. A atribuição aparece dentro do mapa. Se o mapa não carregar, os eventos e endereços continuam disponíveis. As imagens da interface são arquivos locais em `assets/images/`; as fontes usam Google Fonts com alternativas locais.

## Planejador Premium com IA

Requisitos: Java 17 ou superior, acesso à internet e uma chave de API OpenAI com acesso ao modelo configurado. No PowerShell, a partir da raiz do projeto:

```powershell
$env:AI_API_KEY = 'sua-chave-no-ambiente'
$env:AI_MODEL = 'gpt-4o-mini'
.\backend\mvnw.cmd -f backend\pom.xml spring-boot:run
```

O Maven Wrapper baixa o Maven na primeira execução. A API fica em `http://127.0.0.1:8080`. Abra o frontend com Live Server, por exemplo em `http://127.0.0.1:5500`. O chat usa automaticamente a API local quando o site está em `localhost` ou `127.0.0.1`. Para outra origem, defina `window.GOUP_API_BASE_URL` antes de carregar `js/planejador-premium.js`, apontando ao endereço do backend. Configure CORS e autenticação no backend antes de publicar em produção.

Para executar os testes automatizados do backend: `.\backend\mvnw.cmd -f backend\pom.xml test`. Eles usam uma resposta local de teste e não consomem a API da OpenAI.

O endpoint é `POST /api/premium/chat`. Exemplo de corpo:

```json
{"mensagem":"Monte um roteiro em Pomerode","historico":[],"usuarioId":null,"cidadeUsuario":null}
```

A resposta inclui `resposta`, `eventos`, `locais`, `roteiro` e `salvarRoteiro`. O frontend mantém no `localStorage` o histórico (`goup-premium-historico-v2`) e os roteiros salvos (`goup-roteiros-v1`). A versão anterior do histórico simulado (`v1`) não é carregada no chat novo.

O backend envia ao modelo até 12 mensagens anteriores e um recorte de até oito eventos e oito locais do catálogo. Datas e distâncias são calculadas no backend; os IDs devolvidos pela IA são validados antes de virarem links ou roteiros. O catálogo de `backend/src/main/resources/catalogo.json` é gerado a partir de `js/dados.js`; após alterar os dados, execute `node backend/scripts/sync-catalog.mjs` e reinicie a API. O usuário de `localStorage` é apenas uma preferência visual, não uma autenticação confiável. O backend escuta somente em `127.0.0.1`; autenticação, limites de uso e hospedagem segura são pendências para produção.

A variável `AI_API_KEY` não deve ser colocada em HTML, JavaScript, repositório ou `.env.example`. Consulte [o guia oficial da API de texto](https://developers.openai.com/api/docs/guides/text) e [as recomendações oficiais para guardar chaves](https://developers.openai.com/api/docs/guides/production-best-practices).

## Páginas e arquivos principais

| Arquivo | Função |
| --- | --- |
| `index.html`, `js/main.js`, `css/home.css` | Home, busca, filtros e cards |
| `pages/eventos.html`, `pages/evento.html` | Exploração e detalhes por `?id=` |
| `pages/mapa.html`, `js/mapa.js`, `css/mapa.css` | Mapa de eventos e locais, filtros, marcadores e temas |
| `pages/planejador.html` | Roteiro manual demonstrativo |
| `pages/planejador-premium.html`, `js/planejador-premium.js`, `css/planejador-premium.css` | Conversa com a API, histórico e roteiros |
| `backend/` | Endpoint Spring Boot, catálogo sincronizado e integração com a IA |
| `pages/minhas-viagens.html` | Roteiros salvos e favoritos |
| `pages/login.html`, `pages/cadastro.html`, `pages/perfil.html`, `js/auth.js`, `js/auth-pages.js`, `css/auth.css` | Conta e perfil demonstrativos |
| `js/dados.js` | Eventos, locais, cidades e categorias simulados |
| `js/site.js`, `css/style.css` | Navegação, tema, componentes e links compartilhados |
| `js/favoritos.js`, `js/roteiros.js`, `js/pages.js`, `css/pages.css` | Persistência e lógica das páginas |

## Como testar

1. Na Home, clique na imagem, no nome ou em **Ver detalhes** de um card. Todos levam a `pages/evento.html?id=...`. Repita em **Explorar eventos** e abra `pages/evento.html?id=1` diretamente. Teste também `pages/evento.html?id=9999` para ver o estado de evento não encontrado.
2. No detalhe, confira categoria, descrição, data, horário, preço, local, cidade, organizador, mapa e relacionados. Clique no coração. Recarregue a página e confirme que ele continua preenchido.
3. Abra **Favoritos** ou **Minhas viagens**, remova o evento e confira a mensagem de lista vazia. Favoritos também aparecem no perfil quando há uma sessão local.
4. Inicie o backend com `AI_API_KEY`, abra **Planejador Premium** e envie “Monte um roteiro em Pomerode” ou use uma sugestão rápida. Confira se cada pergunta gera uma resposta, se os dados e links correspondem ao catálogo, se o roteiro aparece em **Minhas viagens** e se o histórico sobrevive ao recarregamento. Teste Enter, Shift+Enter e **Limpar conversa**. Para simular uma falha, pare o backend e envie outra mensagem; deve aparecer um aviso amigável.
5. Teste os links do header e o menu em uma janela estreita. Alterne o tema claro/escuro e recarregue. No console do navegador, confira se não há erros locais.
6. No **Mapa**, teste zoom, arraste, cidade, categoria e troca de tema. Clique em **Ver no mapa** e em um marcador para abrir o popup; **Ver detalhes** deve levar ao evento certo. Marque **Mostrar locais próximos** para ver marcadores rosa. Teste **Usar minha localização** com permissão concedida e negada. Em uma janela estreita, confirme que o mapa vem antes da lista e que não há rolagem horizontal.

O estado fica no `localStorage`: `goup-favoritos`, `goup-roteiros-v1`, `goup-premium-historico-v2` e `goup-tema`. Ele é separado por origem; use sempre a mesma porta do Live Server para ver os mesmos dados. Os eventos recebem datas relativas ao dia de acesso.

## Conta demonstrativa

Para testar o perfil, crie uma conta em **Entrar → Criar conta grátis** usando uma senha de teste com pelo menos oito caracteres, letras e números. Depois faça login e abra **Perfil**. As contas e a sessão locais usam `goup-usuarios-v1` e `goup-sessao-v1`. Isso serve apenas para demonstrar a interface: autenticação real e recuperação de senha ainda não estão integradas ao backend.

## Identidade visual

A logo original está em `assets/images/logo-goup.jpg` e aparece no header e no footer. A capa da Home está em `assets/images/hero-festival.jpg`, com gradiente para legibilidade. As imagens mantêm a proporção. As fotos de eventos e cidades são ilustrativas e estão salvas localmente.
