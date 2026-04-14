# Shop Backend

API para gerenciar ofertas de um Shopping.



## Features

* Cadastro de cliente/lojista.
* Criação/Edição de loja.
* Criação/Edição de ofertas.
* Manifestar interesse em uma oferta.
* Comunicação real-time via websocket.
* Scheduler que valida a cada minuto se a oferta está expirada.

## Bibliotecas

* NestJS
* Prisma
* TypeScript
* Socket.io
* JWT
* Bcrypt

## Para rodar você precisa ter instalado

* Node.js v24
* NPM
* Docker
* Docker compose
* Git


## Como rodar

1. Clone o repositório

```bash
$ git clone https://github.com/Cristuker/shop-back.git
```

2. Acesse a pasta do projeto

```bash
$ cd shop-back
```

3. Instale as dependencias
```bash
$ npm i
```

4. Rode o script para gerar os arquivos do prisma
```bash
$ npm run prisma:generate
```

5. Execute o docker

```bash
$ docker compose up -d
```

### Alternativa

Se por algum motivo não conseguir executar a aplicação no docker, comente o serviço no docker compose e suba apenas o back usando o mesmo. Em seguida suba aplicação na sua própria máquina com as instruções abaixos.

## Rodando a API local

1. Instale as dependências 

```bash
$ npm i
```

2. Execute o projeto (o banco já deve estar rodando)

```bash
$ npm run start:dev
```

Por padrão o projeto irá rodar na porta 3000.


## Variaveis de ambiente

O projeto contém apenas duas variaveis de ambiente, as mesmas se encontram no arquivo `.env.example` e também abaixo. A aplicação usando a biblioteca **dotenv** para importar as variaveis para o projeto.

Modifique o nome do arquivo .env.example para .env para executar o projeto.

```bash
    DATABASE_URL=""
    JWT_SECRET=""
    PORT=
```