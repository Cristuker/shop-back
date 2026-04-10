# Docker & Docker Compose Guide

## Configuração Inicial

### 1. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```

Configure as variáveis conforme necessário.

## Comandos Úteis

### Build e Iniciar Containers
```bash
# Construir as imagens e iniciar os containers (modo background)
docker-compose up -d

# Construir as imagens sem cache
docker-compose up -d --build

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f app
docker-compose logs -f postgres
```

### Parar e Remover Containers
```bash
# Parar os containers
docker-compose stop

# Remover os containers (mantém volumes)
docker-compose down

# Remover containers e volumes
docker-compose down -v
```

### Acessar os Containers
```bash
# Acessar terminal do container da aplicação
docker-compose exec app sh

# Acessar terminal do PostgreSQL
docker-compose exec postgres psql -U shop_user -d shop_db

# Executar comandos dentro do container
docker-compose exec app npm test
docker-compose exec app npm run build
```

### Status e Informações
```bash
# Listar containers em execução
docker-compose ps

# Ver os services definidos
docker-compose config

# Health check dos containers
docker-compose ps --format "table {{.Service}}\t{{.Status}}"
```

## Documentação dos Services

### PostgreSQL (postgres)
- **Porta**: 5432
- **Database**: shop_db
- **User**: shop_user
- **Password**: shop_password
- **Volume**: postgres_data (persistência de dados)
- **Health Check**: Ativado - verifica a cada 10s

### NestJS Application (app)
- **Porta**: 3000
- **Dependência**: Aguarda o PostgreSQL estar saudável
- **Volumes**: Sincroniza código em tempo real (desenvolvimento)
- **Health Check**: Ativado - testa HTTP a cada 30s

## Configurações Importantes

### Dockerfile (Multi-stage Build)
- **Stage 1 (builder)**: Compila o TypeScript
- **Stage 2 (production)**: Imagem mínima com apenas produção
- **Segurança**: Usa usuário não-root (nestjs)
- **Signal Handling**: dumb-init para tratamento correto de sinais

### Docker Compose
- **Network**: shop-network (bridge) para comunicação entre containers
- **Restart Policy**: unless-stopped (reinicia se parar, mas não no boot)
- **Health Checks**: Garante que dependências estão prontas
- **Volumes Nomeados**: postgres_data persiste dados entre reinicializações

## Desenvolvimento local com Docker

```bash
# Iniciar com modo watch
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f app

# Modificar código localmente, o container auto-recarrega (se estiver configurado)
# Para rebuild após mudanças grandes:
docker-compose restart app
```

## Produção

Para produção:
1. Remova volumes com `- .:/app` do docker-compose.yml
2. Use imagem do builder stage apenas
3. Configure variáveis de ambiente adequadas
4. Configure reverse proxy (nginx)
5. Use secrets do Docker/Kubernetes para senhas

## Troubleshooting

### Erro: "Cannot connect to Docker daemon"
```bash
sudo service docker start
```

### Erro: "port is already allocated"
```bash
# Mude a porta em docker-compose.yml ou libere a porta
lsof -i :3000  # Verificar o que usa a porta
docker-compose down  # Parar containers anteriores
```

### Erro: "database connection refused"
```bash
# Verifique o health do postgres
docker-compose ps
docker-compose logs postgres

# Aguarde alguns segundos e tente novamente (primeiro boot é lento)
```

### Remover tudo e recomeçar
```bash
docker-compose down -v
docker system prune -a --volumes
docker-compose up -d --build
```
