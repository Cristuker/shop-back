[x] Autenticação
    [x] Endpoint de registro (email/senha)
    [x] Endpoint de login (email/senha)
    [x] Perfil `lojista`
    [x] Perfil `comprador`
    [x] Geração e validação de JWT

[ ] Ofertas
    [o] Criar oferta (título, descrição, desconto %, estoque, validade)
    [ ] Editar oferta
    [ ] Encerrar oferta
    [ ] Listar ofertas ativas (endpoint público com filtro por status)

[x] Loja
    [x] Criar Loja
    [x] Editar Loja
    [x] Listar Lojas

[ ] Interesse
    [ ] Registrar interesse em uma oferta
    [ ] Decrementar estoque a cada interesse registrado

[ ] Tempo real
    [ ] Configurar WebSocket
    [ ] Notificar compradores conectados ao publicar nova oferta

[ ] Infraestrutura
    [x] Configurar banco de dados (PostgreSQL ou MongoDB)
    [x] Configurar docker-compose
    [ ] Escrever testes com Jest (regras de negócio principais)
    [ ] Escrever README com instruções de setup, endpoints, decisões técnicas e trade-offs