# Simple Chat – Nest.js backend

En REST-backend til en chat-applikation, bygget med **Nest.js**, **TypeORM** og **PostgreSQL**.

Opgaven: *"Lav en Chat-applikation med Nest.js"* (Fullstack, EK, efteråret 2026). Formålet er at eksperimentere med de tre relationstyper **one-to-many**, **many-to-one** og **many-to-many** med tre entities: **Users**, **Threads** og **Messages**.

---

## Indhold

1. [Kom i gang](#kom-i-gang)
2. [Datamodel](#datamodel)
3. [Arkitektur – hvordan en request bevæger sig gennem appen](#arkitektur)
4. [Endpoints](#endpoints)
5. [Relationerne forklaret](#relationerne-forklaret)
6. [Designvalg](#designvalg)
7. [Mulige forbedringer](#mulige-forbedringer)

---

## Kom i gang

**Krav:** Node.js og Docker.

```bash
# 1. Installer afhængigheder
npm install

# 2. Opret .env ud fra eksemplet
cp .env.example .env

# 3. Start Postgres i Docker
docker compose up -d

# 4. Start API'et i watch mode (genstarter ved filændringer)
npm run start:dev
```

API'et kører på `http://localhost:3000`.

> **Hvorfor port 5433?** Docker-databasen er mappet til port **5433** på værtsmaskinen (`"5433:5432"` i `docker-compose.yml`). Det er for at undgå konflikt med en lokalt installeret Postgres, som typisk optager 5432. Inde i containeren kører Postgres stadig på 5432.

**Kig i databasen:**
```bash
docker compose exec db psql -U chat -d simplechat -P pager=off -c '\dt'
```

### Konfiguration

Forbindelsesoplysningerne ligger i `.env`, som ikke er i git. Den læses af `@nestjs/config`. `TypeOrmModule.forRootAsync` henter værdierne via `ConfigService`, så der ikke står passwords i koden.

| Variabel | Værdi (dev) |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5433` |
| `DB_USER` | `chat` |
| `DB_PASSWORD` | `chat` |
| `DB_NAME` | `simplechat` |

---

## Datamodel

```
┌──────────┐         ┌──────────────┐         ┌──────────┐
│   user   │ 1     n │   message    │ n     1 │  thread  │
│──────────│◄────────│──────────────│────────►│──────────│
│ id    PK │         │ id        PK │         │ id    PK │
│ username │         │ content      │         │ title    │
│ createdAt│         │ createdAt    │         │ createdAt│
└──────────┘         │ authorId  FK │         └──────────┘
     ▲               │ threadId  FK │               ▲
     │               └──────────────┘               │
     │                                              │
     │       ┌──────────────────────────────┐       │
     └───────│   thread_participants_user   │───────┘
             │──────────────────────────────│
             │ threadId  PK, FK             │
             │ userId    PK, FK             │
             └──────────────────────────────┘
                (mellemtabel, many-to-many)
```

| Entity | Felter | Regler i databasen |
|---|---|---|
| **User** | `id`, `username`, `createdAt` | `username` er `UNIQUE` (giver også et index) |
| **Thread** | `id`, `title`, `createdAt` | |
| **Message** | `id`, `content`, `createdAt`, `authorId`, `threadId` | Begge fremmednøgler er `NOT NULL`, så en besked altid har forfatter og tråd |
| *thread_participants_user* | `threadId`, `userId` | Sammensat primærnøgle, så samme bruger ikke kan være med to gange. `ON DELETE CASCADE` |

Tabellerne oprettes automatisk ud fra entity-klasserne, fordi `synchronize: true` er slået til. Det er kun acceptabelt under udvikling (se [Mulige forbedringer](#mulige-forbedringer)).

---

## Arkitektur

Appen følger Nest's modulære opbygning. Hver entity har sit eget **modul** med samme struktur:

```
src/
├── main.ts                 # Starter appen og slår ValidationPipe til globalt
├── app.module.ts           # Rodmodul: ConfigModule + TypeORM-forbindelse
├── users/
│   ├── entities/user.entity.ts      # Tabeldefinition
│   ├── dto/create-user.dto.ts       # Hvad klienten må sende + valideringsregler
│   ├── dto/update-user.dto.ts       # PartialType af create-DTO'en (alle felter valgfri)
│   ├── users.controller.ts          # HTTP-routes
│   ├── users.service.ts             # Forretningslogik + databasekald
│   └── users.module.ts              # Binder det hele sammen
├── threads/                # Samme struktur + add-participant.dto.ts
└── messages/               # Samme struktur
```

### En request fra start til slut

Eksempel: `POST /messages` med body `{ "content": "Hej", "authorId": 1, "threadId": 1 }`

```
Klient
  │
  ▼
ValidationPipe ──── fejler valideringen? ──► 400 Bad Request
  │                 (fx tom content eller authorId der ikke er et tal)
  ▼
MessagesController.create()      ← modtager den validerede DTO
  │
  ▼
MessagesService.create()
  ├─► UsersService.findOne(1)    ── findes ikke? ──► 404 Not Found
  ├─► ThreadsService.findOne(1)  ── findes ikke? ──► 404 Not Found
  └─► messagesRepository.save()  ← TypeORM laver INSERT
  │
  ▼
Database (PostgreSQL)
```

**Ansvarsfordelingen:**

| Lag | Ansvar | Ved *ikke* noget om |
|---|---|---|
| **Controller** | Oversætter HTTP til metodekald: route, URL-parametre, body | Databasen |
| **Service** | Forretningslogik: opslag, regler, fejl (404) | HTTP |
| **Repository** | Databasekald (leveres af TypeORM) | Forretningsregler |
| **DTO** | Beskriver og validerer input fra klienten | Hvordan data gemmes |
| **Entity** | Beskriver tabellen og dens relationer | Hvad klienten må sende |

### Nøglebegreber

- **Dependency injection:** Klasser opretter ikke selv deres afhængigheder. De beder om dem i constructoren, og Nest leverer dem. Fx får `UsersService` sit repository via `@InjectRepository(User)`.
- **`TypeOrmModule.forFeature([User])`** registrerer en entity i et modul. Det er det, der gør repository'et tilgængeligt for injection.
- **`exports` og `imports` mellem moduler:** En service er som udgangspunkt privat for sit modul. `UsersModule` og `ThreadsModule` eksporterer derfor deres services, og `MessagesModule` importerer begge moduler. Så kan `MessagesService` genbruge `findOne` med indbygget 404 i stedet for at skrive opslagslogikken igen.
- **`ValidationPipe({ whitelist: true })`** kører på alle requests. Den afviser ugyldigt input med 400 og fjerner felter, som DTO'en ikke kender.

---

## Endpoints

### Users
| Metode | Route | Body | Svar |
|---|---|---|---|
| POST | `/users` | `{ "username": "rasmus" }` | 201 + bruger |
| GET | `/users` | | Alle brugere |
| GET | `/users/:id` | | Én bruger · 404 hvis den ikke findes |
| PATCH | `/users/:id` | `{ "username": "nyt" }` | Opdateret bruger |
| DELETE | `/users/:id` | | Slettet bruger |

### Threads
| Metode | Route | Body | Svar |
|---|---|---|---|
| POST | `/threads` | `{ "title": "Generel snak" }` | 201 + tråd |
| GET | `/threads` | | Alle tråde |
| GET | `/threads/:id` | | Én tråd **inkl. deltagere** |
| PATCH | `/threads/:id` | `{ "title": "Nyt navn" }` | Opdateret tråd |
| DELETE | `/threads/:id` | | Slettet tråd |
| POST | `/threads/:id/participants` | `{ "userId": 1 }` | Tråden med deltagerliste |
| DELETE | `/threads/:id/participants/:userId` | | Tråden med deltagerliste |

### Messages
| Metode | Route | Body | Svar |
|---|---|---|---|
| POST | `/messages` | `{ "content": "Hej", "authorId": 1, "threadId": 1 }` | 201 + besked |
| GET | `/messages` | | Alle beskeder **inkl. author og thread** |
| GET | `/messages/:id` | | Én besked inkl. author og thread |
| PATCH | `/messages/:id` | `{ "content": "Rettet" }` | Opdateret besked (kun `content` kan ændres) |
| DELETE | `/messages/:id` | | Slettet besked |

### Eksempel med curl
```bash
curl -X POST localhost:3000/users -H "Content-Type: application/json" -d '{"username":"rasmus"}'
curl -X POST localhost:3000/threads -H "Content-Type: application/json" -d '{"title":"Generel snak"}'
curl -X POST localhost:3000/messages -H "Content-Type: application/json" -d '{"content":"Hej alle","authorId":1,"threadId":1}'
curl -X POST localhost:3000/threads/1/participants -H "Content-Type: application/json" -d '{"userId":1}'
curl localhost:3000/messages
```

---

## Relationerne forklaret

### One-to-many / many-to-one: User → Message ← Thread

En bruger skriver mange beskeder, og en tråd indeholder mange beskeder. Hver besked har præcis én forfatter og hører til præcis én tråd.

```ts
// message.entity.ts – "mange"-siden. Her ligger fremmednøglen.
@ManyToOne(() => User, (user) => user.messages, { nullable: false })
author: User;          // → kolonnen authorId

// user.entity.ts – "én"-siden. Ingen kolonne i databasen.
@OneToMany(() => Message, (message) => message.author)
messages: Message[];
```

- **Fremmednøglen ligger altid på "mange"-siden.** Det er `message`-tabellen, der har `authorId` og `threadId`.
- `@OneToMany` laver ingen kolonne. Den gør det bare muligt at navigere fra en bruger til dens beskeder i koden.
- `() => User` er en funktion og ikke bare `User`, fordi entity-filerne importerer hinanden i ring. Funktionen udskyder opslaget, til alle klasser er indlæst.
- `{ nullable: false }` gør kolonnen `NOT NULL`, så databasen selv afviser en besked uden forfatter. TypeORM's standard er nullable.

**Hente relationer:** TypeORM henter ikke relationer automatisk. I `MessagesService` bruges:
```ts
this.messagesRepository.find({ relations: { author: true, thread: true } });
```
Det bliver til en SQL-`JOIN`, og svaret indeholder `author` og `thread` som indlejrede objekter.

**Oprette med relationer:** Klienten sender id'er (`authorId`), men entity'en forventer objekter (`author: User`). `MessagesService.create` slår derfor først bruger og tråd op og bygger beskeden med objekterne. TypeORM skriver selv id'erne i fremmednøglekolonnerne.

### Many-to-many: User ↔ Thread (deltagere)

En bruger kan deltage i mange tråde, og en tråd kan have mange deltagere. Det kan ikke udtrykkes med en fremmednøgle i en af tabellerne, så der bruges en **mellemtabel**.

```ts
// thread.entity.ts – "ejersiden" med @JoinTable
@ManyToMany(() => User, (user) => user.threads)
@JoinTable()
participants: User[];

// user.entity.ts – den modsatte side, uden @JoinTable
@ManyToMany(() => Thread, (thread) => thread.participants)
threads: Thread[];
```

- `@JoinTable()` står på **én** af siderne og får TypeORM til at oprette `thread_participants_user`.
- Mellemtabellen har en **sammensat primærnøgle** `(threadId, userId)` og et index på hver kolonne, så opslag i begge retninger er hurtige.
- **Mellemtabellen røres aldrig direkte.** For at tilføje en deltager hentes tråden med `participants`, brugeren pushes ind i arrayet, og der kaldes `save()`. TypeORM sammenligner med databasen og laver selv de nødvendige `INSERT`/`DELETE`.

```ts
async addParticipant(threadId: number, userId: number) {
  const thread = await this.findOne(threadId);            // inkl. participants
  const user = await this.usersService.findOne(userId);   // 404 hvis ukendt
  if (!thread.participants.some((p) => p.id === user.id)) {
    thread.participants.push(user);
  }
  return await this.threadsRepository.save(thread);
}
```

---

## Designvalg

| Valg | Begrundelse |
|---|---|
| **Nestede routes til deltagere** (`/threads/:id/participants`) | Deltagere giver kun mening i forhold til en bestemt tråd. Beskeder har derimod deres egen flade route (`/messages`), fordi de har et selvstændigt id. Mønstret følger REST-afsnittet i undervisningen om TypeORM-relationer. |
| **Kun `content` kan ændres på en besked** | `UpdateMessageDto` tillader teknisk set også `authorId`/`threadId`. Servicen kopierer bevidst kun `content`, så en besked ikke kan "flyttes" til en anden forfatter eller tråd. |
| **Ingen dubletter blandt deltagere** | `addParticipant` tjekker først, om brugeren allerede er med. Ellers ville databasens primærnøgle afvise dubletten med en 500-fejl. |
| **`NOT NULL` på fremmednøglerne i `message`** | Reglen "en besked har altid en forfatter og en tråd" håndhæves i databasen og ikke kun i koden. |
| **Genbrug af `findOne` på tværs af services** | Én samlet måde at slå op og kaste 404 på. Derfor eksporteres services mellem moduler. |
| **CommonJS + Jest** frem for ESM + Vitest | Matcher undervisningsmaterialet og undgår ESM-problemer med TypeORM-relationer, der refererer til hinanden. |
| **Ingen `ON DELETE CASCADE` på `message`** | Postgres afviser at slette en bruger eller tråd, der stadig har beskeder. Mellemtabellen har derimod cascade, fordi deltagerrækker ikke har nogen værdi uden brugeren eller tråden. |

---

## Mulige forbedringer

- **Authentication (JWT):** I dag sender klienten selv `authorId`. Med login burde forfatteren tages fra den indloggede bruger, så man ikke kan skrive i andres navn.
- **Kun deltagere må skrive i en tråd:** `MessagesService.create` kunne tjekke, at forfatteren er med i `thread.participants`.
- **WebSockets** (`@nestjs/websockets`): push nye beskeder til klienter i realtid i stedet for at klienten skal spørge.
- **409 Conflict ved dublet-username:** I dag giver et brugernavn, der allerede findes, en 500-fejl fra databasen. Det burde fanges og oversættes til 409.
- **`ParseIntPipe`** på `:id`-parametre i stedet for `+id`, så `/users/abc` giver 400 i stedet for en databasefejl.
- **Migrations** i stedet for `synchronize: true`. `synchronize` kan slette data, når en entity ændres, og må ikke bruges i produktion.
- **Pagination** på `GET /messages`, fx `?threadId=1&page=1&limit=50`, og et index på `message.threadId`.
- **Swagger** (`@nestjs/swagger`) til automatisk API-dokumentation.
- **Tests:** De genererede `.spec.ts`-filer er ikke tilpasset endnu.
