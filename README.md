# CombatePlus API — Documentação Completa
**Base URL:** `http://localhost:3333/api/v1`
**WebSocket:** `ws://localhost:3333/ws/fights?fightId={id}`
**Health Check:** `GET /health`

---

## Índice

1. [Autenticação e Headers](#1-autenticação-e-headers)
2. [Padrão de Resposta](#2-padrão-de-resposta)
3. [Roles e Permissões](#3-roles-e-permissões)
4. [AUTH — Autenticação](#4-auth--autenticação)
5. [USERS — Usuários](#5-users--usuários)
6. [EVENTS — Eventos](#6-events--eventos)
7. [CATEGORIES — Categorias do Evento](#7-categories--categorias-do-evento)
8. [REGISTRATIONS — Inscrições](#8-registrations--inscrições)
9. [PAYMENTS — Pagamentos](#9-payments--pagamentos)
10. [BRACKETS — Chaveamentos](#10-brackets--chaveamentos)
11. [FIGHTS — Lutas](#11-fights--lutas)
12. [HIGHLIGHTS — Destaques](#12-highlights--destaques)
13. [NEWS — Notícias](#13-news--notícias)
14. [PRODUCTS — Produtos](#14-products--produtos)
15. [ORDERS — Pedidos](#15-orders--pedidos)
16. [WebSocket — Lutas ao Vivo](#16-websocket--lutas-ao-vivo)
17. [Enums de Referência](#17-enums-de-referência)
18. [Códigos de Erro](#18-códigos-de-erro)

---

## 1. Autenticação e Headers

A API usa **JWT Bearer Token** para rotas protegidas.

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

O `access_token` é obtido via `POST /auth/login` ou `POST /auth/refresh`.

> **Expiração:** O access token expira em `15m` (configurável). Use o `refreshToken` para renová-lo sem novo login.

---

## 2. Padrão de Resposta

### Sucesso — 200 OK
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensagem opcional"
}
```

### Criação — 201 Created
```json
{
  "success": true,
  "data": { ... },
  "message": "Criado com sucesso"
}
```

### Sem conteúdo — 204 No Content
*(corpo vazio)*

### Paginação — 200 OK
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Erro
```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

### Erro de Validação — 422 Unprocessable Entity
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    { "field": "email", "message": "Invalid email" },
    { "field": "cpf", "message": "CPF inválido" }
  ]
}
```

---

## 3. Roles e Permissões

| Role | Descrição |
|---|---|
| `ADMIN` | Acesso total a todas as rotas |
| `ORGANIZER` | Gerencia seus próprios eventos, categorias, inscrições e pagamentos |
| `ATHLETE` | Acesso ao próprio perfil, inscrições e pedidos |

---

## 4. AUTH — Autenticação

### `POST /auth/register`
Cria uma nova conta de atleta.

**Autenticação:** Não requerida

**Body:**
```json
{
  "name": "Lucas Ferreira",
  "email": "lucas@alliance.com.br",
  "password": "Senha@123",
  "cpf": "222.222.222-22",
  "phone": "(81) 99999-0002",
  "birthdate": "1995-04-20T00:00:00.000Z"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `name` | string | ✅ | min 3, max 120 |
| `email` | string | ✅ | email válido, único |
| `password` | string | ✅ | min 8 chars, 1 maiúscula, 1 número |
| `cpf` | string | ✅ | formato `000.000.000-00`, único |
| `phone` | string | ❌ | — |
| `birthdate` | string (ISO datetime) | ❌ | — |

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Lucas Ferreira",
    "email": "lucas@alliance.com.br",
    "role": "ATHLETE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "Conta criada com sucesso!"
}
```

**Erros:** `409` E-mail ou CPF já cadastrado.

---

### `POST /auth/login`
Realiza login e retorna os tokens de acesso.

**Autenticação:** Não requerida

**Body:**
```json
{
  "email": "lucas@alliance.com.br",
  "password": "Senha@123"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Lucas Ferreira",
      "email": "lucas@alliance.com.br",
      "role": "ATHLETE"
    }
  }
}
```

**Erros:** `401` Credenciais inválidas / usuário inativo.

---

### `POST /auth/refresh`
Renova o access token usando um refresh token válido (rotation automático — o token antigo é invalidado).

**Autenticação:** Não requerida

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:** `401` Token inválido ou expirado.

---

### `POST /auth/logout`
Invalida o refresh token informado.

**Autenticação:** Não requerida

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Resposta:** `204 No Content`

---

### `GET /auth/me`
Retorna os dados do usuário autenticado.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Lucas Ferreira",
    "email": "lucas@alliance.com.br",
    "cpf": "222.222.222-22",
    "phone": "(81) 99999-0002",
    "birthdate": "1995-04-20T00:00:00.000Z",
    "role": "ATHLETE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 5. USERS — Usuários

### `GET /users`
Lista todos os usuários ativos com paginação e filtros.

**Autenticação:** `ADMIN`

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página (default: 1) |
| `perPage` | number | Itens por página (default: 20, max: 100) |
| `role` | string | Filtrar por `ADMIN \| ORGANIZER \| ATHLETE` |
| `search` | string | Busca por nome ou email (case-insensitive) |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lucas Ferreira",
      "email": "lucas@alliance.com.br",
      "cpf": "222.222.222-22",
      "phone": "(81) 99999-0002",
      "birthdate": "1995-04-20T00:00:00.000Z",
      "role": "ATHLETE",
      "active": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_count": {
        "registrations": 5,
        "organizedEvents": 0
      }
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 100, "totalPages": 5 }
}
```

---

### `GET /users/:id`
Retorna um usuário pelo ID.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE` (atleta só vê o próprio)

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Lucas Ferreira",
    "email": "lucas@alliance.com.br",
    "cpf": "222.222.222-22",
    "phone": "(81) 99999-0002",
    "birthdate": "1995-04-20T00:00:00.000Z",
    "role": "ATHLETE",
    "active": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "_count": { "registrations": 5, "organizedEvents": 0 }
  }
}
```

**Erros:** `403` Sem permissão. `404` Usuário não encontrado.

---

### `PUT /users/:id`
Atualiza dados de um usuário. Atleta só edita o próprio perfil e não pode alterar `role`.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body** *(todos os campos opcionais):*
```json
{
  "name": "Lucas Ferreira Silva",
  "email": "novo@email.com",
  "cpf": "333.333.333-33",
  "phone": "(81) 99999-0003",
  "birthdate": "1995-04-20T00:00:00.000Z",
  "role": "ORGANIZER"
}
```

> ⚠️ Apenas `ADMIN` pode alterar `role`.

**Erros:** `403` Sem permissão. `404` Não encontrado. `409` Email/CPF duplicado.

---

### `PATCH /users/me/password`
Altera a senha do usuário autenticado. Invalida todos os refresh tokens ao concluir.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body:**
```json
{
  "currentPassword": "SenhaAtual@123",
  "newPassword": "NovaSenha@456"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "data": { "message": "Senha alterada com sucesso. Faça login novamente." }
}
```

**Erros:** `400` Senha atual incorreta.

---

### `DELETE /users/:id`
Desativa (soft delete) um usuário. Invalida todos os refresh tokens do usuário.

**Autenticação:** `ADMIN`

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Lucas Ferreira", "active": false },
  "message": "Usuário desativado."
}
```

**Erros:** `400` Usuário já desativado. `404` Não encontrado.

---

### `PATCH /users/:id/reactivate`
Reativa um usuário desativado.

**Autenticação:** `ADMIN`

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Lucas Ferreira", "active": true },
  "message": "Usuário reativado."
}
```

**Erros:** `400` Usuário já está ativo. `404` Não encontrado.

---

### `GET /users/:id/dashboard`
Retorna o dashboard de um atleta: inscrições recentes, cashbacks acumulados e estatísticas de luta.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE` (atleta só vê o próprio)

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "registrations": [
      {
        "id": "uuid",
        "event": { "id": "uuid", "title": "Copa Nordeste BJJ 2025", "startDate": "...", "venueCity": "Recife" },
        "category": { "name": "Masculino Faixa Azul Leve", "belt": "BLUE" },
        "payment": { "status": "APPROVED", "amountCents": 7250 }
      }
    ],
    "cashbacks": {
      "list": [
        { "id": "uuid", "amountCents": 725, "percentUsed": 10, "granted": false, "createdAt": "..." }
      ],
      "totalCents": 725
    },
    "fightStats": {
      "wins": 3,
      "totalFights": 5
    }
  }
}
```

---

## 6. EVENTS — Eventos

### `GET /events`
Lista eventos com filtros e paginação.

**Autenticação:** Não requerida (pública)

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página (default: 1) |
| `perPage` | number | Itens por página (default: 20) |
| `status` | string | `DRAFT \| PUBLISHED \| ONGOING \| FINISHED \| CANCELLED` |
| `city` | string | Filtra por cidade (case-insensitive) |
| `state` | string | Filtra por estado (2 letras, ex: `PE`) |
| `search` | string | Busca por título (case-insensitive) |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Copa Nordeste BJJ 2025",
      "slug": "copa-nordeste-bjj-2025",
      "description": "O maior campeonato...",
      "bannerUrl": null,
      "status": "PUBLISHED",
      "venueName": "Ginásio Municipal",
      "venueAddress": "Av. Agamenon Magalhães, 4650",
      "venueCity": "Recife",
      "venueState": "PE",
      "venueLat": -8.0476,
      "venueLng": -34.877,
      "startDate": "2025-06-15T08:00:00.000Z",
      "endDate": "2025-06-15T20:00:00.000Z",
      "registrationDeadline": "2025-06-10T23:59:59.000Z",
      "maxAthletes": 1000,
      "organizer": { "id": "uuid", "name": "João Organizador" },
      "_count": { "registrations": 45 }
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 3, "totalPages": 1 }
}
```

---

### `GET /events/highlights`
Lista eventos em destaque (com destaque pago, ativo e dentro do período).

**Autenticação:** Não requerida (pública)

> ⚠️ Esta rota deve ser chamada **antes** de `GET /events/:id` para evitar conflito de slug. O Express processa rotas na ordem em que são declaradas.

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Copa Nordeste BJJ 2025",
      "slug": "copa-nordeste-bjj-2025",
      "status": "PUBLISHED",
      "highlights": [ { "id": "uuid", "type": "NOBLE_AREA", "paid": true, "active": true } ]
    }
  ]
}
```

---

### `GET /events/:id`
Retorna um evento pelo `id` (UUID) ou `slug`.

**Autenticação:** Não requerida (pública)

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Copa Nordeste BJJ 2025",
    "slug": "copa-nordeste-bjj-2025",
    "description": "...",
    "bannerUrl": "/uploads/banners/1234-abc.jpg",
    "status": "PUBLISHED",
    "organizerId": "uuid",
    "venueName": "Ginásio Municipal",
    "venueAddress": "Av. Agamenon Magalhães, 4650",
    "venueCity": "Recife",
    "venueState": "PE",
    "venueLat": -8.0476,
    "venueLng": -34.877,
    "startDate": "2025-06-15T08:00:00.000Z",
    "endDate": "2025-06-15T20:00:00.000Z",
    "registrationDeadline": "2025-06-10T23:59:59.000Z",
    "platformFeeOverride": null,
    "rules": null,
    "maxAthletes": 1000,
    "organizer": { "id": "uuid", "name": "João Organizador" },
    "categories": [ ... ],
    "_count": { "registrations": 45 }
  }
}
```

**Erros:** `404` Evento não encontrado.

---

### `GET /events/:id/stats`
Retorna estatísticas de inscrições de um evento (contagem por status e receita).

**Autenticação:** `ADMIN | ORGANIZER`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "total": 80,
    "byStatus": {
      "PENDING": 10,
      "PAYMENT_SENT": 5,
      "APPROVED": 60,
      "REJECTED": 3,
      "CANCELLED": 2
    },
    "revenue": {
      "totalCents": 450000,
      "platformFeeCents": 15000
    }
  }
}
```

---

### `POST /events`
Cria um novo evento. O slug é gerado automaticamente a partir do título.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "title": "Copa Nordeste BJJ 2025",
  "description": "O maior campeonato de Jiu-Jitsu do Nordeste brasileiro.",
  "venueName": "Ginásio Municipal Geraldo Magalhães",
  "venueAddress": "Av. Agamenon Magalhães, 4650",
  "venueCity": "Recife",
  "venueState": "PE",
  "venueLat": -8.0476,
  "venueLng": -34.877,
  "startDate": "2025-06-15T08:00:00.000Z",
  "endDate": "2025-06-15T20:00:00.000Z",
  "registrationDeadline": "2025-06-10T23:59:59.000Z",
  "maxAthletes": 1000,
  "platformFeeOverride": 500,
  "rules": "Seguir regras IBJJF 2025."
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `title` | string | ✅ | min 3, max 200 |
| `venueName` | string | ✅ | min 2 |
| `venueAddress` | string | ✅ | min 5 |
| `venueCity` | string | ✅ | min 2 |
| `venueState` | string | ✅ | exatamente 2 letras |
| `startDate` | string (ISO) | ✅ | datetime ISO 8601 |
| `endDate` | string (ISO) | ✅ | datetime ISO 8601 |
| `registrationDeadline` | string (ISO) | ✅ | datetime ISO 8601 |
| `description` | string | ❌ | — |
| `venueLat` | number | ❌ | — |
| `venueLng` | number | ❌ | — |
| `maxAthletes` | number | ❌ | inteiro positivo |
| `platformFeeOverride` | number | ❌ | inteiro, sobrescreve taxa global |
| `rules` | string | ❌ | — |

**Resposta 201:** Objeto do evento criado.

---

### `PUT /events/:id`
Atualiza um evento. Organizador só pode atualizar seus próprios eventos.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:** Mesmo schema de criação, todos os campos opcionais. Pode incluir também:
```json
{
  "status": "PUBLISHED"
}
```

**Erros:** `403` Sem permissão. `404` Não encontrado.

---

### `POST /events/:id/banner`
Faz upload do banner do evento. Aceita **arquivo multipart** OU **URL externa no body**.

**Autenticação:** `ADMIN | ORGANIZER`

**Opção 1 — Arquivo multipart:**
```
Content-Type: multipart/form-data
Campo: banner (arquivo JPG, PNG, WEBP ou PDF, máx 10MB)
```

**Opção 2 — URL no body:**
```json
{
  "imageUrl": "https://exemplo.com/banner.jpg"
}
```

**Resposta 200:** Objeto do evento com `bannerUrl` atualizado.

**Erros:** `400` Sem arquivo ou URL. `403` Sem permissão. `404` Não encontrado.

---

## 7. CATEGORIES — Categorias do Evento

### `GET /events/:eventId/categories`
Lista todas as categorias de um evento com contagem de inscrições.

**Autenticação:** Não requerida (pública)

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "name": "Masculino Faixa Azul Leve",
      "gender": "MALE",
      "belt": "BLUE",
      "weightMin": 64.01,
      "weightMax": 70,
      "isAbsolute": false,
      "price": 7000,
      "maxSlots": 64,
      "createdAt": "...",
      "_count": { "registrations": 12 }
    }
  ]
}
```

---

### `GET /categories/:id`
Retorna uma categoria pelo ID.

**Autenticação:** Não requerida (pública)

**Erros:** `404` Categoria não encontrada.

---

### `POST /events/:eventId/categories`
Cria uma categoria para um evento. Organizador só pode criar em seus próprios eventos.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "name": "Masculino Faixa Azul Médio",
  "gender": "MALE",
  "belt": "BLUE",
  "weightMin": 70.01,
  "weightMax": 76,
  "isAbsolute": false,
  "price": 7000,
  "maxSlots": 64
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `name` | string | ✅ | min 3, max 100 |
| `gender` | string | ✅ | `MALE \| FEMALE` |
| `belt` | string | ✅ | `WHITE \| BLUE \| PURPLE \| BROWN \| BLACK` |
| `price` | number | ✅ | inteiro positivo (centavos) |
| `weightMin` | number | ❌ | decimal |
| `weightMax` | number | ❌ | decimal |
| `isAbsolute` | boolean | ❌ | default: false |
| `maxSlots` | number | ❌ | inteiro positivo |

**Erros:** `403` Sem permissão. `404` Evento não encontrado.

---

### `PUT /categories/:id`
Atualiza uma categoria. Organizador só pode editar categorias dos seus eventos.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:** Mesmo schema de criação, todos os campos opcionais.

**Erros:** `403` Sem permissão. `404` Não encontrada.

---

### `DELETE /categories/:id`
Remove uma categoria. Não é possível excluir se houver inscrições vinculadas.

**Autenticação:** `ADMIN | ORGANIZER`

**Resposta:** `204 No Content`

**Erros:** `400` Categoria com inscrições não pode ser excluída. `403` Sem permissão. `404` Não encontrada.

---

## 8. REGISTRATIONS — Inscrições

### `POST /registrations`
Cria uma inscrição para o atleta autenticado. Cria automaticamente o registro de `Payment` com status `PENDING`.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body:**
```json
{
  "eventId": "uuid-do-evento",
  "categoryId": "uuid-da-categoria",
  "teamName": "Alliance",
  "notes": "Observação opcional"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `eventId` | string (UUID) | ✅ | — |
| `categoryId` | string (UUID) | ✅ | — |
| `teamName` | string | ✅ | min 2, max 100 |
| `notes` | string | ❌ | max 500 |

**Validações automáticas:**
- Evento deve ter status `PUBLISHED` ou `ONGOING`
- Prazo de inscrição não pode ter vencido
- Categoria deve pertencer ao evento informado
- Vagas da categoria não podem estar esgotadas
- Vagas totais do evento não podem estar esgotadas
- Atleta não pode se inscrever duas vezes na mesma categoria (a menos que a anterior esteja `CANCELLED`)

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "categoryId": "uuid",
    "athleteId": "uuid",
    "teamName": "Alliance",
    "status": "PENDING",
    "event": { "id": "uuid", "title": "Copa Nordeste BJJ 2025", "startDate": "..." },
    "category": { "id": "uuid", "name": "Masculino Faixa Azul Leve", "belt": "BLUE", "price": 7000 },
    "payment": { "amountCents": 7250, "platformFeeCents": 250, "status": "PENDING" }
  },
  "message": "Criado com sucesso"
}
```

**Erros:** `400` Prazo/vagas/status inválido. `404` Evento/categoria não encontrada. `409` Inscrição duplicada.

---

### `GET /registrations`
Lista inscrições com filtros. Atleta vê apenas as próprias.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página (default: 1) |
| `perPage` | number | Itens por página (default: 20) |
| `eventId` | string (UUID) | Filtrar por evento |
| `categoryId` | string (UUID) | Filtrar por categoria |
| `athleteId` | string (UUID) | Filtrar por atleta *(admin/org apenas)* |
| `status` | string | `PENDING \| PAYMENT_SENT \| APPROVED \| REJECTED \| CANCELLED` |
| `teamName` | string | Busca por nome de equipe |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "APPROVED",
      "teamName": "Alliance",
      "athlete": { "id": "uuid", "name": "Lucas Ferreira", "email": "..." },
      "event": { "id": "uuid", "title": "...", "startDate": "...", "venueCity": "Recife" },
      "category": { "id": "uuid", "name": "...", "belt": "BLUE", "gender": "MALE" },
      "payment": { "amountCents": 7250, "platformFeeCents": 250, "status": "APPROVED", "receiptUrl": "..." }
    }
  ],
  "meta": { ... }
}
```

---

### `GET /registrations/:id`
Retorna uma inscrição completa. Atleta só pode ver a própria.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Resposta 200:** Objeto completo com `athlete`, `event`, `category`, `payment` e `cashback`.

**Erros:** `403` Sem permissão. `404` Não encontrada.

---

### `PATCH /registrations/:id/cancel`
Cancela uma inscrição. Atleta só cancela a própria e apenas se status for `PENDING` ou `PAYMENT_SENT`. Admin/Organizer pode cancelar qualquer status.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "CANCELLED" },
  "message": "Inscrição cancelada."
}
```

**Erros:** `400` Não é possível cancelar inscrição aprovada (atleta). `403` Sem permissão. `404` Não encontrada.

---

### `GET /events/:eventId/athletes`
Retorna a lista de atletas inscritos em um evento, agrupada por categoria.

**Autenticação:** `ADMIN | ORGANIZER`

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `teamName` | string | Filtrar por equipe |
| `categoryId` | string (UUID) | Filtrar por categoria |
| `status` | string | Filtrar por status da inscrição |

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "totalRegistrations": 80,
    "categories": [
      {
        "category": { "id": "uuid", "name": "Masculino Faixa Azul Leve", "belt": "BLUE" },
        "count": 12,
        "athletes": [
          {
            "registrationId": "uuid",
            "registrationStatus": "APPROVED",
            "teamName": "Alliance",
            "notes": null,
            "paymentStatus": "APPROVED",
            "athlete": { "id": "uuid", "name": "Lucas Ferreira", "email": "...", "phone": "..." }
          }
        ]
      }
    ]
  }
}
```

---

## 9. PAYMENTS — Pagamentos

### `POST /payments/:registrationId/receipt`
Envia o comprovante de pagamento de uma inscrição. Aceita **arquivo multipart** OU **URL no body**.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE` (atleta só envia o próprio)

**Opção 1 — Arquivo multipart:**
```
Content-Type: multipart/form-data
Campo: receipt (arquivo JPG, PNG, WEBP ou PDF, máx 10MB)
```

**Opção 2 — URL no body:**
```json
{
  "imageUrl": "https://exemplo.com/comprovante.jpg"
}
```

**Resposta 200:** Objeto do `Payment` com `status: "PENDING"` e `receiptUrl` atualizado. A inscrição passa para `PAYMENT_SENT`.

**Erros:** `400` Pagamento já aprovado. `403` Sem permissão. `404` Inscrição/pagamento não encontrado.

---

### `PATCH /payments/:registrationId/approve`
Aprova um pagamento. Cria automaticamente o registro de `Cashback` (10% do valor pago). A inscrição passa para `APPROVED`.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "status": "APPROVED", "approvedAt": "2025-01-01T00:00:00.000Z" },
  "message": "Pagamento aprovado!"
}
```

**Erros:** `400` Pagamento já aprovado. `404` Não encontrado.

---

### `PATCH /payments/:registrationId/reject`
Rejeita um pagamento com um motivo. A inscrição passa para `REJECTED`.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "reason": "Comprovante ilegível. Envie uma imagem mais nítida."
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `reason` | string | ✅ | min 5, max 300 |

**Resposta 200:**
```json
{
  "success": true,
  "data": { "status": "REJECTED", "rejectedReason": "...", "rejectedAt": "..." },
  "message": "Pagamento rejeitado."
}
```

---

### `GET /payments/pending`
Lista pagamentos pendentes (com comprovante enviado, aguardando análise).

**Autenticação:** `ADMIN | ORGANIZER`

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página (default: 1) |
| `perPage` | number | Itens por página |
| `eventId` | string (UUID) | Filtrar por evento |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amountCents": 7250,
      "platformFeeCents": 250,
      "status": "PENDING",
      "receiptUrl": "/uploads/receipts/abc.jpg",
      "registration": {
        "athlete": { "id": "uuid", "name": "Lucas Ferreira", "email": "..." },
        "event": { "id": "uuid", "title": "Copa Nordeste BJJ 2025" },
        "category": { "id": "uuid", "name": "...", "belt": "BLUE", "gender": "MALE" }
      }
    }
  ],
  "meta": { ... }
}
```

---

## 10. BRACKETS — Chaveamentos

### `POST /events/:eventId/brackets/:categoryId/generate`
Gera o chaveamento eliminatório de uma categoria. Distribui atletas evitando confrontos da mesma equipe na primeira rodada. Preenche com BYEs (null) até a próxima potência de 2.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:** Nenhum

**Requisito:** A categoria deve ter no mínimo 2 inscrições com status `APPROVED`.

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "categoryId": "uuid",
    "generated": true,
    "category": { "id": "uuid", "name": "...", "belt": "BLUE" },
    "fights": [
      {
        "id": "uuid",
        "round": 1,
        "position": 0,
        "status": "SCHEDULED",
        "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
        "fighterB": { "id": "uuid", "name": "João Silva" },
        "winner": null
      }
    ]
  },
  "message": "Chaveamento gerado!"
}
```

**Erros:** `400` Menos de 2 inscrições aprovadas.

---

### `GET /events/:eventId/brackets/:categoryId`
Retorna o chaveamento de uma categoria específica com todas as lutas ordenadas por round e posição.

**Autenticação:** Não requerida (pública)

**Resposta 200:** Mesmo formato de retorno da geração.

**Erros:** `404` Chaveamento não gerado ainda.

---

### `GET /events/:eventId/brackets`
Lista todos os chaveamentos de um evento (sem as lutas — apenas metadados).

**Autenticação:** Não requerida (pública)

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "categoryId": "uuid",
      "generated": true,
      "category": { "id": "uuid", "name": "...", "belt": "BLUE" },
      "_count": { "fights": 7 }
    }
  ]
}
```

---

## 11. FIGHTS — Lutas

### `GET /fights/live`
Lista todas as lutas com status `ONGOING` em todos os eventos.

**Autenticação:** Não requerida (pública)

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "round": 1,
      "position": 0,
      "status": "ONGOING",
      "matNumber": 3,
      "startedAt": "2025-06-15T10:00:00.000Z",
      "scoreA": 4, "scoreB": 0,
      "advantagesA": 1, "advantagesB": 0,
      "penaltiesA": 0, "penaltiesB": 1,
      "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
      "fighterB": { "id": "uuid", "name": "João Silva" },
      "category": { "name": "Masculino Faixa Azul Leve", "belt": "BLUE", "gender": "MALE" },
      "bracket": {
        "event": { "id": "uuid", "title": "Copa Nordeste BJJ 2025", "venueCity": "Recife" }
      }
    }
  ]
}
```

---

### `GET /fights/:id`
Retorna uma luta pelo ID com todos os dados.

**Autenticação:** Não requerida (pública)

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bracketId": "uuid",
    "categoryId": "uuid",
    "round": 1,
    "position": 0,
    "status": "FINISHED",
    "matNumber": 2,
    "scheduledAt": null,
    "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
    "fighterB": { "id": "uuid", "name": "João Silva" },
    "winner": { "id": "uuid", "name": "Lucas Ferreira" },
    "scoreA": 6, "scoreB": 2,
    "advantagesA": 2, "advantagesB": 0,
    "penaltiesA": 0, "penaltiesB": 1,
    "durationSeconds": 300,
    "startedAt": "...",
    "finishedAt": "...",
    "category": { "id": "uuid", "name": "...", "belt": "BLUE" }
  }
}
```

**Erros:** `404` Luta não encontrada.

---

### `GET /brackets/:bracketId/fights`
Lista todas as lutas de um chaveamento específico, ordenadas por round e posição.

**Autenticação:** Não requerida (pública)

**Resposta 200:** Array de lutas com `fighterA`, `fighterB` e `winner`.

---

### `PATCH /fights/:id/start`
Inicia uma luta. A luta deve estar com status `SCHEDULED` e ter dois lutadores definidos.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:** Nenhum

**Efeitos:**
- Status da luta muda para `ONGOING`
- `startedAt` é registrado
- Evento WebSocket `FIGHT_STARTED` é transmitido para a sala

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "ONGOING", "startedAt": "..." },
  "message": "Luta iniciada!"
}
```

**Erros:** `400` Luta não está agendada ou sem dois lutadores.

---

### `PATCH /fights/:id/score`
Atualiza a pontuação de uma luta em andamento.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "scoreA": 4,
  "scoreB": 0,
  "advantagesA": 1,
  "advantagesB": 0,
  "penaltiesA": 0,
  "penaltiesB": 1
}
```

Todos os campos são **obrigatórios** e inteiros >= 0.

**Efeitos:** Evento WebSocket `SCORE_UPDATE` é transmitido para a sala.

**Erros:** `400` Luta não está em andamento.

---

### `PATCH /fights/:id/finish`
Finaliza uma luta, define o vencedor e avança automaticamente o vencedor para a próxima fase do chaveamento.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "winnerId": "uuid-do-vencedor",
  "durationSeconds": 300,
  "scoreA": 6,
  "scoreB": 2,
  "advantagesA": 2,
  "advantagesB": 0,
  "penaltiesA": 0,
  "penaltiesB": 1
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `winnerId` | string (UUID) | ✅ | deve ser `fighterAId` ou `fighterBId` |
| `durationSeconds` | number | ✅ | inteiro positivo |
| `scoreA` | number | ✅ | inteiro >= 0 |
| `scoreB` | number | ✅ | inteiro >= 0 |
| `advantagesA` | number | ❌ | default 0 |
| `advantagesB` | number | ❌ | default 0 |
| `penaltiesA` | number | ❌ | default 0 |
| `penaltiesB` | number | ❌ | default 0 |

**Efeitos:**
- Status muda para `FINISHED`, `finishedAt` é registrado
- Vencedor é automaticamente posicionado na luta da próxima rodada
- Evento WebSocket `FIGHT_FINISHED` é transmitido para a sala

**Erros:** `400` Luta já finalizada ou `winnerId` inválido.

---

### `PATCH /fights/:id/mat`
Atribui um número de tatame a uma luta.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "matNumber": 3
}
```

**Resposta 200:** Objeto da luta com `matNumber` atualizado.

---

## 12. HIGHLIGHTS — Destaques

### `GET /highlights`
Lista destaques com filtros e paginação.

**Autenticação:** Não requerida (pública)

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página |
| `perPage` | number | Itens por página |
| `eventId` | string (UUID) | Filtrar por evento |
| `active` | string | `"true"` ou `"false"` |
| `type` | string | `TICKER \| NOBLE_AREA \| BOTH` |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "type": "NOBLE_AREA",
      "startsAt": "2025-06-01T00:00:00.000Z",
      "endsAt": "2025-06-30T23:59:59.000Z",
      "priceCents": 15000,
      "paid": true,
      "active": true,
      "event": { "id": "uuid", "title": "...", "venueCity": "Recife" }
    }
  ],
  "meta": { ... }
}
```

---

### `GET /highlights/active`
Lista destaques ativos, pagos e dentro do período atual (para exibição no frontend).

**Autenticação:** Não requerida (pública)

> ⚠️ Esta rota deve ser chamada **antes** de `GET /highlights` para evitar conflito. O Express processa na ordem declarada.

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "NOBLE_AREA",
      "event": {
        "id": "uuid",
        "title": "Copa Nordeste BJJ 2025",
        "slug": "copa-nordeste-bjj-2025",
        "venueCity": "Recife",
        "venueState": "PE",
        "startDate": "...",
        "bannerUrl": "/uploads/banners/abc.jpg"
      }
    }
  ]
}
```

---

### `POST /highlights`
Cria um destaque para um evento.

**Autenticação:** `ADMIN | ORGANIZER`

**Body:**
```json
{
  "eventId": "uuid-do-evento",
  "type": "NOBLE_AREA",
  "startsAt": "2025-06-01T00:00:00.000Z",
  "endsAt": "2025-06-30T23:59:59.000Z",
  "priceCents": 15000
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `eventId` | string (UUID) | ✅ | — |
| `type` | string | ✅ | `TICKER \| NOBLE_AREA \| BOTH` |
| `startsAt` | string (ISO) | ✅ | datetime ISO 8601 |
| `endsAt` | string (ISO) | ✅ | datetime ISO 8601 |
| `priceCents` | number | ✅ | inteiro positivo |

**Resposta 201:** Objeto do destaque com `paid: false` e `active: true`.

**Erros:** `404` Evento não encontrado.

---

### `PATCH /highlights/:id/confirm`
Confirma o pagamento de um destaque, ativando-o.

**Autenticação:** `ADMIN`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "paid": true, "active": true },
  "message": "Destaque ativado!"
}
```

---

### `PATCH /highlights/:id/deactivate`
Desativa um destaque.

**Autenticação:** `ADMIN`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "active": false },
  "message": "Destaque desativado."
}
```

---

## 13. NEWS — Notícias

### `GET /news`
Lista notícias. Usuários não autenticados e atletas veem apenas publicadas. Admin vê todas.

**Autenticação:** Não requerida *(opcional: com token de admin para ver rascunhos)*

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página |
| `perPage` | number | Itens por página |
| `search` | string | Busca por título ou nome do autor |

**Resposta 200** *(paginada):* Retorna a lista com `excerpt` (primeiros 200 chars do conteúdo) — o `content` completo não é incluído na listagem.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Copa Nordeste 2025: tudo o que você precisa saber",
      "slug": "copa-nordeste-2025-tudo",
      "coverUrl": "/uploads/covers/abc.jpg",
      "authorName": "Equipe CombatePlus",
      "published": true,
      "publishedAt": "2025-05-01T00:00:00.000Z",
      "createdAt": "...",
      "excerpt": "A Copa Nordeste BJJ 2025 promete ser..."
    }
  ],
  "meta": { ... }
}
```

---

### `GET /news/:id`
Retorna uma notícia completa pelo `id` (UUID) ou `slug`. Não autenticados/atletas só veem publicadas.

**Autenticação:** Não requerida *(opcional)*

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Copa Nordeste 2025",
    "slug": "copa-nordeste-2025-tudo",
    "content": "Conteúdo completo da notícia...",
    "coverUrl": "/uploads/covers/abc.jpg",
    "authorName": "Equipe CombatePlus",
    "published": true,
    "publishedAt": "2025-05-01T00:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Erros:** `404` Não encontrada ou não publicada.

---

### `POST /news`
Cria uma nova notícia. Slug gerado automaticamente; se conflito, adiciona timestamp.

**Autenticação:** `ADMIN`

**Body:**
```json
{
  "title": "Copa Nordeste 2025: inscrições abertas!",
  "content": "Conteúdo completo da notícia em texto ou HTML...",
  "authorName": "Equipe CombatePlus",
  "published": false
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `title` | string | ✅ | min 3, max 200 |
| `content` | string | ✅ | min 10 |
| `authorName` | string | ✅ | min 2 |
| `published` | boolean | ❌ | default false |

**Resposta 201:** Objeto da notícia criada.

---

### `PUT /news/:id`
Atualiza uma notícia. Se `published` mudar para `true` pela primeira vez, define `publishedAt`. Se mudar para `false`, limpa `publishedAt`. Se o `title` mudar, regenera o slug.

**Autenticação:** `ADMIN`

**Body:** Mesmo schema de criação, todos os campos opcionais.

---

### `POST /news/:id/cover`
Faz upload da imagem de capa da notícia. Aceita **arquivo multipart** OU **URL no body**.

**Autenticação:** `ADMIN`

**Opção 1 — Arquivo multipart:**
```
Content-Type: multipart/form-data
Campo: cover (arquivo JPG, PNG, WEBP ou PDF, máx 10MB)
```

**Opção 2 — URL no body:**
```json
{
  "imageUrl": "https://exemplo.com/capa.jpg"
}
```

**Resposta 200:** Objeto da notícia com `coverUrl` atualizado.

---

### `PATCH /news/:id/publish`
Publica uma notícia (define `published: true` e `publishedAt: now()`).

**Autenticação:** `ADMIN`

**Body:** Nenhum

**Erros:** `400` Notícia já publicada.

---

### `PATCH /news/:id/unpublish`
Despublica uma notícia (define `published: false` e `publishedAt: null`).

**Autenticação:** `ADMIN`

**Body:** Nenhum

---

### `DELETE /news/:id`
Remove uma notícia permanentemente.

**Autenticação:** `ADMIN`

**Resposta:** `204 No Content`

---

## 14. PRODUCTS — Produtos

### `GET /products`
Lista produtos. Não autenticados e atletas veem apenas os ativos.

**Autenticação:** Não requerida *(opcional)*

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página |
| `perPage` | number | Itens por página |
| `category` | string | `APPAREL \| EQUIPMENT \| ACCESSORIES` |
| `search` | string | Busca por nome ou descrição |
| `inStock` | string | `"true"` para apenas produtos com estoque > 0 |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rashguard Competição",
      "description": "Rashguard Competição — linha oficial CombatePlus",
      "category": "APPAREL",
      "price": 14990,
      "stock": 20,
      "imageUrl": null,
      "active": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": { ... }
}
```

---

### `GET /products/:id`
Retorna um produto pelo ID. Não autenticados/atletas não veem produtos inativos.

**Autenticação:** Não requerida *(opcional)*

**Erros:** `404` Produto não encontrado ou inativo.

---

### `POST /products`
Cria um novo produto.

**Autenticação:** `ADMIN`

**Body:**
```json
{
  "name": "Rashguard Competição",
  "description": "Rashguard linha oficial CombatePlus",
  "category": "APPAREL",
  "price": 14990,
  "stock": 20
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `name` | string | ✅ | min 2, max 200 |
| `category` | string | ✅ | `APPAREL \| EQUIPMENT \| ACCESSORIES` |
| `price` | number | ✅ | inteiro positivo (centavos) |
| `description` | string | ❌ | — |
| `stock` | number | ❌ | inteiro >= 0, default 0 |

**Resposta 201:** Objeto do produto criado.

---

### `PUT /products/:id`
Atualiza um produto.

**Autenticação:** `ADMIN`

**Body:** Mesmo schema de criação, todos os campos opcionais.

---

### `POST /products/:id/image`
Faz upload da imagem do produto. Aceita **arquivo multipart** OU **URL no body**.

**Autenticação:** `ADMIN`

**Opção 1 — Arquivo multipart:**
```
Content-Type: multipart/form-data
Campo: image (arquivo JPG, PNG, WEBP ou PDF, máx 10MB)
```

**Opção 2 — URL no body:**
```json
{
  "imageUrl": "https://exemplo.com/produto.jpg"
}
```

**Resposta 200:** Objeto do produto com `imageUrl` atualizado.

---

### `PATCH /products/:id/stock`
Ajusta o estoque de um produto por delta (positivo para adicionar, negativo para remover).

**Autenticação:** `ADMIN`

**Body:**
```json
{
  "delta": 10
}
```

> Exemplos: `delta: 10` adiciona 10 unidades. `delta: -5` remove 5 unidades.

**Erros:** `400` Estoque insuficiente (resultado seria negativo).

---

### `PATCH /products/:id/deactivate`
Desativa um produto (soft delete). Não remove dados de pedidos históricos.

**Autenticação:** `ADMIN`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "active": false },
  "message": "Produto desativado."
}
```

---

### `PATCH /products/:id/reactivate`
Reativa um produto desativado.

**Autenticação:** `ADMIN`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "active": true },
  "message": "Produto reativado."
}
```

---

## 15. ORDERS — Pedidos

### `POST /orders`
Cria um novo pedido para o usuário autenticado. Valida estoque de todos os itens e debita em transação atômica. Retorna erro se qualquer item estiver sem estoque suficiente.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body:**
```json
{
  "items": [
    { "productId": "uuid-produto-1", "quantity": 2 },
    { "productId": "uuid-produto-2", "quantity": 1 }
  ]
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `items` | array | ✅ | min 1 item |
| `items[].productId` | string (UUID) | ✅ | produto ativo |
| `items[].quantity` | number | ✅ | inteiro positivo |

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "totalCents": 38970,
    "status": "PENDING",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "quantity": 2,
        "unitCents": 14990,
        "product": { "id": "uuid", "name": "Rashguard Competição", "imageUrl": null }
      }
    ]
  },
  "message": "Criado com sucesso"
}
```

**Erros:** `400` Estoque insuficiente. `404` Produto inativo ou não encontrado.

---

### `GET /orders`
Lista pedidos. Atleta vê apenas os próprios.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Query Params:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | number | Página |
| `perPage` | number | Itens por página |
| `userId` | string (UUID) | Filtrar por usuário *(admin/org apenas)* |
| `status` | string | `PENDING \| PAID \| SHIPPED \| DELIVERED \| CANCELLED` |

**Resposta 200** *(paginada):*
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "totalCents": 38970,
      "status": "PENDING",
      "createdAt": "...",
      "user": { "id": "uuid", "name": "Lucas Ferreira", "email": "..." },
      "items": [
        {
          "productId": "uuid",
          "quantity": 2,
          "unitCents": 14990,
          "product": { "id": "uuid", "name": "Rashguard Competição", "category": "APPAREL", "imageUrl": null }
        }
      ]
    }
  ],
  "meta": { ... }
}
```

---

### `GET /orders/stats`
Retorna estatísticas de vendas para o dashboard admin.

**Autenticação:** `ADMIN`

> ⚠️ Esta rota deve ser chamada **antes** de `GET /orders/:id` para evitar conflito. O Express processa na ordem declarada.

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "PENDING": 20,
      "PAID": 100,
      "SHIPPED": 15,
      "DELIVERED": 10,
      "CANCELLED": 5
    },
    "revenue": { "totalCents": 5850000 },
    "topProducts": [
      { "productId": "uuid", "name": "Rashguard Competição", "totalSold": 45 },
      { "productId": "uuid", "name": "Camiseta CombatePlus Premium", "totalSold": 38 }
    ]
  }
}
```

---

### `GET /orders/:id`
Retorna um pedido pelo ID. Atleta só pode ver o próprio.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "totalCents": 38970,
    "status": "PENDING",
    "createdAt": "...",
    "user": { "id": "uuid", "name": "Lucas Ferreira", "email": "...", "phone": "..." },
    "items": [
      {
        "productId": "uuid",
        "quantity": 2,
        "unitCents": 14990,
        "product": { "id": "uuid", "name": "Rashguard Competição", "category": "APPAREL", "imageUrl": null, "price": 14990 }
      }
    ]
  }
}
```

**Erros:** `403` Sem permissão. `404` Não encontrado.

---

### `PATCH /orders/:id/status`
Atualiza o status de um pedido.

**Autenticação:** `ADMIN`

**Body:**
```json
{
  "status": "PAID"
}
```

Valores válidos: `PENDING | PAID | SHIPPED | DELIVERED | CANCELLED`

**Erros:** `400` Status inválido. `404` Não encontrado.

---

### `PATCH /orders/:id/cancel`
Cancela um pedido e devolve o estoque de todos os itens. Atleta só pode cancelar o próprio e somente se status for `PENDING`.

**Autenticação:** `ADMIN | ORGANIZER | ATHLETE`

**Body:** Nenhum

**Resposta 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "CANCELLED" },
  "message": "Pedido cancelado."
}
```

**Erros:** `400` Pedido já cancelado ou em andamento (atleta). `403` Sem permissão.

---

## 16. WebSocket — Lutas ao Vivo

### Conexão

```
ws://localhost:3333/ws/fights?fightId={uuid-da-luta}
```

O parâmetro `fightId` é **obrigatório**. A conexão é encerrada com código `1008` se ausente.

### Mensagem de confirmação (recebida ao conectar)
```json
{
  "type": "CONNECTED",
  "fightId": "uuid-da-luta"
}
```

### Eventos recebidos

#### `FIGHT_STARTED` — Luta iniciada
```json
{
  "type": "FIGHT_STARTED",
  "fight": {
    "id": "uuid",
    "status": "ONGOING",
    "startedAt": "2025-06-15T10:00:00.000Z",
    "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
    "fighterB": { "id": "uuid", "name": "João Silva" }
  }
}
```

#### `SCORE_UPDATE` — Placar atualizado
```json
{
  "type": "SCORE_UPDATE",
  "fight": {
    "id": "uuid",
    "scoreA": 4,
    "scoreB": 0,
    "advantagesA": 1,
    "advantagesB": 0,
    "penaltiesA": 0,
    "penaltiesB": 1,
    "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
    "fighterB": { "id": "uuid", "name": "João Silva" }
  }
}
```

#### `FIGHT_FINISHED` — Luta finalizada
```json
{
  "type": "FIGHT_FINISHED",
  "fight": {
    "id": "uuid",
    "status": "FINISHED",
    "winnerId": "uuid",
    "finishedAt": "2025-06-15T10:05:00.000Z",
    "durationSeconds": 300,
    "winner": { "id": "uuid", "name": "Lucas Ferreira" },
    "fighterA": { "id": "uuid", "name": "Lucas Ferreira" },
    "fighterB": { "id": "uuid", "name": "João Silva" }
  }
}
```

### Exemplo de uso (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:3333/ws/fights?fightId=uuid-da-luta');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'CONNECTED':
      console.log('Conectado à luta:', msg.fightId);
      break;
    case 'FIGHT_STARTED':
      console.log('Luta iniciada!', msg.fight);
      break;
    case 'SCORE_UPDATE':
      console.log('Placar:', msg.fight.scoreA, 'x', msg.fight.scoreB);
      break;
    case 'FIGHT_FINISHED':
      console.log('Vencedor:', msg.fight.winner.name);
      break;
  }
};
```

---

## 17. Enums de Referência

| Enum | Valores |
|---|---|
| `Role` | `ADMIN` \| `ORGANIZER` \| `ATHLETE` |
| `EventStatus` | `DRAFT` \| `PUBLISHED` \| `ONGOING` \| `FINISHED` \| `CANCELLED` |
| `RegistrationStatus` | `PENDING` \| `PAYMENT_SENT` \| `APPROVED` \| `REJECTED` \| `CANCELLED` |
| `PaymentStatus` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `BeltColor` | `WHITE` \| `BLUE` \| `PURPLE` \| `BROWN` \| `BLACK` |
| `Gender` | `MALE` \| `FEMALE` |
| `FightStatus` | `SCHEDULED` \| `ONGOING` \| `FINISHED` \| `BYE` |
| `HighlightType` | `TICKER` \| `NOBLE_AREA` \| `BOTH` |
| `ProductCategory` | `APPAREL` \| `EQUIPMENT` \| `ACCESSORIES` |
| `OrderStatus` | `PENDING` \| `PAID` \| `SHIPPED` \| `DELIVERED` \| `CANCELLED` |

---

## 18. Códigos de Erro

| Código | Significado | Casos comuns |
|---|---|---|
| `400` | Bad Request | Dados inválidos, regra de negócio violada, estoque insuficiente |
| `401` | Unauthorized | Token ausente, inválido ou expirado |
| `403` | Forbidden | Role insuficiente, tentativa de acessar recurso alheio |
| `404` | Not Found | Recurso não encontrado, rota inexistente |
| `409` | Conflict | Duplicidade (email, CPF, inscrição repetida) |
| `413` | Payload Too Large | Arquivo enviado maior que 10MB |
| `415` | Unsupported Media Type | Formato de arquivo não aceito |
| `422` | Unprocessable Entity | Falha na validação Zod (campos com formato incorreto) |
| `500` | Internal Server Error | Erro inesperado no servidor |

---

*CombatePlus API — Documentação gerada para uso por sistemas de IA e integradores*
*Versão da API: v1 | Base: `/api/v1`*