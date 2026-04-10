# Desafio Técnico — Desenvolvedor Fullstack Pleno

## Contexto

Você foi contratado para construir um MVP de uma plataforma onde lojistas de um shopping publicam ofertas relâmpago e compradores acompanham em tempo real as promoções ativas, podendo expressar interesse.

---

## O que deve ser construído

### Backend (Sugestão: NestJS + TypeScript)

- **Autenticação**: registro e login via email/senha. Dois perfis: `lojista` e `comprador`.  (Sugestão: JWT)
- **Ofertas**: lojistas criam, editam e encerram ofertas (título, descrição, desconto %, estoque, validade).
- **Interesse**: compradores registram interesse em uma oferta. O estoque decrementa a cada interesse registrado.
- **Notificação em tempo real**: via WebSocket — compradores conectados recebem aviso quando uma nova oferta é publicada.
- **Endpoint público**: listar ofertas ativas, com filtro por status.

### Frontend (Sugestão: React + TypeScript)

- Tela de login e registro (suportando os dois perfis).
- Dashboard do lojista: listar e criar suas ofertas, visualizar quantos interessados cada uma tem.
- Feed do comprador: listar ofertas ativas, registrar interesse e receber notificações em tempo real de novas ofertas.

---

## Requisitos técnicos obrigatórios

| Camada | Tecnologia | Sugestão |
|---|---|---|
| Backend | Node.js | TypeScript + NestJS |
| Banco de dados | SQL ou noSQL | PostgreSQL ou MongoDB |
| Tempo real | WebSocket |
| Testes | Jest |
| Containerização | `docker-compose` | 

---

## Critérios de avaliação

1. **Arquitetura e organização** — separação de responsabilidades, estrutura de módulos, nomenclatura.
2. **Qualidade de código** — princípios SOLID, lógica de negócio fora dos controllers, sem vazamento entre camadas.
3. **Testes** — cobertura das principais regras de negócio.
4. **Funcionalidade** — o fluxo básico funciona end-to-end.
5. **README** — instruções de setup, decisões técnicas e trade-offs assumidos.

---

## Observações importantes

- Esperamos uma UI simples e responsiva — somos desenvolvedores, não designers.
- Sua API deve ser acessível e testável independentemente do frontend.

---

## Como entregar

Publique o código-fonte no GitHub, Bitbucket ou GitLab e nos envie o link por e-mail para **mendonca@multishopping.com.br** com seu **nome completo**, **telefone para contato** e **LinkedIn**.

Certifique-se de escrever um README claro, como se fosse para um projeto open source. Um novo desenvolvedor deve conseguir rodar e entender o projeto somente através dele.

---

Obrigado e boa sorte!