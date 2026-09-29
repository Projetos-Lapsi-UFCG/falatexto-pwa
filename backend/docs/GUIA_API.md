# Guia prático da API do Fala-Texto

Um passo a passo pra quem está chegando agora (dev, pesquisador(a) ou curioso(a)) e quer entender **e reproduzir** cada caso de uso do backend: criar formulário, montar seções e perguntas, registrar um preenchimento (submissão), apagar coisas e usar o Vision Engine (extração com LLM).

> Os exemplos dos casos de uso 1 a 11 foram executados de verdade contra a API rodando localmente, e as respostas mostradas são as que a API devolveu (só encurtamos partes repetitivas com `...`). No caso de uso 12, a resposta de sucesso da LLM é ilustrativa, porque o conteúdo varia conforme o modelo e o texto enviado.

---

## Sumário

1. [Antes de começar](#1-antes-de-começar)
2. [Como os dados são organizados](#2-como-os-dados-são-organizados)
3. [Três jeitos de chamar a API](#3-três-jeitos-de-chamar-a-api)
4. [Caso de uso 1 — Verificar se a API está no ar](#caso-de-uso-1--verificar-se-a-api-está-no-ar)
5. [Caso de uso 2 — Listar e consultar formulários](#caso-de-uso-2--listar-e-consultar-formulários)
6. [Caso de uso 3 — Criar um formulário](#caso-de-uso-3--criar-um-formulário)
7. [Caso de uso 4 — Adicionar uma seção ao formulário](#caso-de-uso-4--adicionar-uma-seção-ao-formulário)
8. [Caso de uso 5 — Adicionar perguntas (os 4 tipos)](#caso-de-uso-5--adicionar-perguntas-os-4-tipos)
9. [Caso de uso 6 — Consultar a estrutura montada](#caso-de-uso-6--consultar-a-estrutura-montada)
10. [Caso de uso 7 — Editar formulário e perguntas](#caso-de-uso-7--editar-formulário-e-perguntas)
11. [Caso de uso 8 — Registrar um preenchimento (submissão)](#caso-de-uso-8--registrar-um-preenchimento-submissão)
12. [Caso de uso 9 — Listar, filtrar e consultar submissões](#caso-de-uso-9--listar-filtrar-e-consultar-submissões)
13. [Caso de uso 10 — Remover submissão](#caso-de-uso-10--remover-submissão)
14. [Caso de uso 11 — Remover pergunta, seção e formulário](#caso-de-uso-11--remover-pergunta-seção-e-formulário)
15. [Caso de uso 12 — Extrair dados clínicos com o Vision Engine (LLM)](#caso-de-uso-12--extrair-dados-clínicos-com-o-vision-engine-llm)
16. [Erros comuns e como resolver](#erros-comuns-e-como-resolver)
17. [Limitações conhecidas](#limitações-conhecidas)
18. [Cola rápida (todos os endpoints)](#cola-rápida-todos-os-endpoints)

---

## 1. Antes de começar

### O que você precisa

- **Docker** e **Docker Compose** instalados.
- Um terminal com **`curl`** (já vem no macOS e na maioria das distros Linux).
- *(Opcional)* `jq`, pra deixar o JSON das respostas mais bonito: `curl ... | jq`.

### Subindo o backend

Tem dois jeitos. Pra seguir este guia, o **jeito A** já basta.

**A) Só API + banco (mais leve, recomendado pra este guia)**

```bash
# a partir da raiz do repositório (falatexto-pwa/)
docker compose -f backend/docker-compose.backend.yml up -d --build
```

**B) Sistema completo (API + banco + Vision Engine + Ollama + frontend + proxy)** — necessário só pro caso de uso 12 (LLM):

```bash
docker compose up -d --build
```

### Conferindo que subiu

```bash
curl http://localhost:8000/
```

Resposta esperada:

```json
{"mensagem":"API funcionando com FastAPI"}
```

> **Importante:** na primeira vez que o MongoDB sobe, ele roda o script `backend/scripts/init-db.js`, que cria dados de exemplo: os formulários `form_001` ("Protocolo de Cirurgia Cardíaca") e `form_002` ("Novo prontuário"). Por isso você já vai ver formulários na listagem mesmo sem ter criado nada.
>
> Quer começar do zero? `docker compose -f backend/docker-compose.backend.yml down -v` apaga o volume do banco; ao subir de novo, os dados de exemplo são recriados.

### Endereço base

Todas as rotas (menos o health check) ficam debaixo de `/api/v1`:

```
http://localhost:8000/api/v1
```

Se estiver usando o sistema completo com o proxy nginx, também funciona via `http://localhost/api/v1/...`.

---

## 2. Como os dados são organizados

Pense num formulário clínico em papel: ele tem **blocos** (ex.: "Identificação", "Sinais vitais") e cada bloco tem **perguntas**. Quando alguém preenche uma cópia desse formulário pra um paciente, isso vira uma **submissão**.

```
Formulário (form_010)                    ← o "modelo" em branco
 └── Seção (sec_identificacao)           ← um bloco do formulário
      ├── Pergunta (q_nome)              ← ABERTA
      ├── Pergunta (q_alergia)           ← ESTIMULADA
      └── Pergunta (q_pa)                ← COMPOSTA (agrupa q_pa_sist + q_pa_diast)

Submissão (6abbc5e0...)                  ← uma cópia preenchida do form_010
```

| Conceito | Coleção no Mongo | Formato do id | Quem escolhe o id |
|---|---|---|---|
| Formulário | `forms` | `form_` + **3 dígitos** (ex.: `form_010`) | Você |
| Seção | `sections` | `sec_` + letras/números/`_` (ex.: `sec_identificacao`) | Você |
| Pergunta | `questions` | `q_` + letras/números/`_` (ex.: `q_nome`) | Você |
| Submissão | `submissions` | ObjectId do Mongo (ex.: `6abbc5e04056bc20de740b6a`) | O banco (automático) |

**Como as peças se ligam:** cada peça "filha" guarda o id do pai no campo `parentItem`, e o pai guarda a lista de ids dos filhos (`sections` no formulário, `questions` na seção). A API cuida dessas duas pontas pra você quando você cria ou apaga pelas rotas certas.

### Os 4 tipos de pergunta

| Tipo | Pra que serve | Precisa de `options`? | Precisa de `compositeFields`? | Exemplo |
|---|---|---|---|---|
| `ABERTA` | Resposta livre (texto, data ou número) | ❌ não pode ter | ❌ não pode ter | "Queixa principal" |
| `ESTIMULADA` | Escolhe **uma** opção | ✅ obrigatório | ❌ não pode ter | "Sexo: F / M" |
| `MULTIPLA` | Marca **várias** opções | ✅ obrigatório | ❌ não pode ter | "Sintomas: febre, tosse, dor" |
| `COMPOSTA` | Agrupa outras perguntas | ❌ não pode ter | ✅ obrigatório | "Pressão arterial = sistólica + diastólica" |

Extras:

- `inputFormat` (`texto`, `data` ou `numero`) — só vale pra `ABERTA`. É uma dica pro frontend mostrar o campo certo (ex.: um seletor de data).
- Uma opção pode ter um **complemento**: um campo extra que aparece quando ela é escolhida (o clássico "Outro, qual?"). Pra isso use `hasComplement: true` + `complementLabel` (e opcionalmente `complementType`: `text` ou `number`).

---

## 3. Três jeitos de chamar a API

1. **Swagger (mais fácil, pelo navegador):** abra http://localhost:8000/docs. Cada rota tem um botão **"Try it out"**, um exemplo de corpo já preenchido e o botão **"Execute"**. Ótimo pra quem não curte terminal.
2. **`curl` no terminal:** é o que usamos neste guia, porque dá pra copiar e colar.
3. **Postman / Insomnia / Thunder Client:** importe o OpenAPI de http://localhost:8000/openapi.json e todas as rotas aparecem prontas.

> **Dica pro curl:** sempre que for mandar JSON (`POST`/`PUT`), inclua `-H "Content-Type: application/json"`. Quer ver o código HTTP da resposta? Acrescente `-w " [HTTP %{http_code}]\n"`.

---

## Caso de uso 1 — Verificar se a API está no ar

**Quando usar:** antes de qualquer coisa, pra saber se o servidor está respondendo.

```bash
curl http://localhost:8000/
```

```json
{"mensagem":"API funcionando com FastAPI"}
```

Esse endpoint não depende do banco. Se ele responde mas os outros dão erro, o problema provavelmente é a conexão com o MongoDB.

---

## Caso de uso 2 — Listar e consultar formulários

### Passo 1: listar todos

```bash
curl http://localhost:8000/api/v1/forms
```

```json
{
  "forms": [
    {"_id": "form_001", "name": "Protocolo de Cirurgia Cardíaca",
     "metadata": {"version": "1.0", "active": true}, "questionCount": 2},
    {"_id": "form_002", "name": "Novo prontuário",
     "metadata": {"version": "1.0", "active": true}, "questionCount": 1}
  ]
}
```

- A listagem é **resumida**: traz id, nome, metadados e `questionCount` (quantas perguntas o formulário tem, contando as das subseções e **sem** contar as perguntas que são "filhas" de uma `COMPOSTA`).

### Passo 2: ver um formulário específico

```bash
curl http://localhost:8000/api/v1/forms/form_001
```

```json
{
  "_id": "form_001",
  "name": "Protocolo de Cirurgia Cardíaca",
  "sections": ["sec_101", "sec_102"],
  "metadata": {"version": "1.0", "active": true}
}
```

Repare que `sections` traz só os **ids**. Pra ver o conteúdo das seções, use o caso de uso 6.

**Se o id não existir:** `404` com `{"detail":"Formulário não encontrado"}`.

---

## Caso de uso 3 — Criar um formulário

Vamos criar um formulário de exemplo: **"Triagem de Enfermagem"**. Ele vai ser usado nos próximos casos de uso.

### Passo 1: escolha um id livre

O id tem que seguir o padrão **`form_` + exatamente 3 dígitos**. Liste os formulários (caso de uso 2) e escolha um que ainda não existe — aqui vamos usar `form_010`.

### Passo 2: envie o POST

```bash
curl -X POST http://localhost:8000/api/v1/forms \
  -H "Content-Type: application/json" \
  -d '{
    "id": "form_010",
    "name": "Triagem de Enfermagem",
    "sections": [],
    "metadata": {"version": "1.0", "active": true}
  }'
```

**Resposta — `201 Created`:**

```json
{
  "_id": "form_010",
  "name": "Triagem de Enfermagem",
  "sections": [],
  "metadata": {"version": "1.0", "active": true}
}
```

### O que cada campo significa

| Campo | Obrigatório | Regras |
|---|---|---|
| `id` | sim | `form_` + 3 dígitos; não pode repetir |
| `name` | sim | 3 a 120 caracteres |
| `sections` | não | Lista de ids de seção. **Deixe vazio** — as seções entram no passo seguinte e a API preenche isso sozinha |
| `metadata.version` | sim | Texto de 1 a 20 caracteres (ex.: `"1.0"`) |
| `metadata.active` | sim | `true` ou `false` |

> Não dá pra mandar campos extras (qualquer campo desconhecido gera `422`). Também não vale deixar o valor literal `"string"` que o Swagger coloca como exemplo — a API recusa.

### O que pode dar errado

- **Id repetido** → `400` `{"detail":"Já existe um formulário com esse id"}`
- **Id fora do padrão** (ex.: `"triagem"`) → `422`:
  ```json
  {"detail":[{"type":"string_pattern_mismatch","loc":["body","id"],
    "msg":"String should match pattern '^form_\\d{3}$'", "input":"triagem", ...}]}
  ```

---

## Caso de uso 4 — Adicionar uma seção ao formulário

### Passo 1: crie a seção dentro do formulário

A rota recebe o id do formulário **na URL**:

```bash
curl -X POST http://localhost:8000/api/v1/forms/form_010/sections \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sec_identificacao",
    "title": "Identificação",
    "tags": ["identificacao"]
  }'
```

**Resposta — `201 Created`:**

```json
{
  "_id": "sec_identificacao",
  "title": "Identificação",
  "parentItem": "form_010",
  "subSections": [],
  "questions": [],
  "tags": ["identificacao"]
}
```

### Passo 2: confira que o formulário "ganhou" a seção

```bash
curl http://localhost:8000/api/v1/forms/form_010
```

```json
{"_id":"form_010","name":"Triagem de Enfermagem","sections":["sec_identificacao"], ...}
```

A API fez duas coisas de uma vez: criou a seção **e** incluiu `sec_identificacao` na lista `sections` do formulário.

### Campos

| Campo | Obrigatório | Regras |
|---|---|---|
| `id` | sim | `sec_` + letras/números/`_`; único |
| `title` | sim | 3 a 120 caracteres |
| `questions` | não | Deixe vazio — preenchido automaticamente no caso de uso 5 |
| `subSections` | não | Ids de subseções (veja [Limitações](#limitações-conhecidas)) |
| `tags` | não | Palavras-chave livres, sem repetição |

**Erros:** formulário inexistente → `404`; id de seção já usado → `400`.

---

## Caso de uso 5 — Adicionar perguntas (os 4 tipos)

Todas as perguntas são criadas com:

```
POST /api/v1/sections/{id_da_seção}/questions
```

A API cria a pergunta e já a coloca no fim da lista `questions` da seção. **A ordem em que você cria é a ordem em que elas aparecem.**

### 5.1 Pergunta ABERTA (texto livre)

```bash
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_nome", "title": "Nome completo", "type": "ABERTA"}'
```

```json
{"_id":"q_nome","parentItem":"sec_identificacao","title":"Nome completo",
 "type":"ABERTA","options":[],"compositeFields":[],"inputFormat":null}
```

### 5.2 Pergunta ABERTA com formato (data ou número)

```bash
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_nasc", "title": "Data de nascimento", "type": "ABERTA", "inputFormat": "data"}'
```

O `inputFormat` só muda **como o frontend mostra o campo** (um calendário, por exemplo). A API não valida o valor digitado depois.

### 5.3 Pergunta ESTIMULADA (escolha única), com complemento

```bash
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{
    "id": "q_alergia",
    "title": "Possui alguma alergia?",
    "type": "ESTIMULADA",
    "options": [
      {"label": "Não", "value": "nao"},
      {"label": "Sim", "value": "sim",
       "hasComplement": true, "complementLabel": "Qual?", "complementType": "text"}
    ]
  }'
```

- `label` é o que aparece na tela; `value` é o que fica salvo na resposta.
- Com `hasComplement: true`, o `complementLabel` é obrigatório. Sem ele, não pode mandar `complementLabel` nem `complementType`.

### 5.4 Pergunta MULTIPLA (várias opções)

```bash
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{
    "id": "q_sintomas",
    "title": "Sintomas atuais",
    "type": "MULTIPLA",
    "options": [
      {"label": "Febre", "value": "febre"},
      {"label": "Tosse", "value": "tosse"},
      {"label": "Dor",   "value": "dor"}
    ]
  }'
```

### 5.5 Pergunta COMPOSTA (agrupa outras)

Uma `COMPOSTA` junta perguntas que fazem sentido lado a lado (ex.: pressão = sistólica × diastólica). **Crie primeiro as perguntas "filhas"**, depois a composta apontando pra elas:

```bash
# filhas
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_pa_sist", "title": "PA sistólica", "type": "ABERTA", "inputFormat": "numero"}'

curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_pa_diast", "title": "PA diastólica", "type": "ABERTA", "inputFormat": "numero"}'

# composta
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_pa", "title": "Pressão arterial", "type": "COMPOSTA",
       "compositeFields": ["q_pa_sist", "q_pa_diast"]}'
```

> A API **não confere** se os ids em `compositeFields` existem. Se você digitar errado, ela aceita do mesmo jeito — então capriche na digitação.

### O que pode dar errado

Mandar uma `ESTIMULADA` sem opções:

```bash
curl -X POST http://localhost:8000/api/v1/sections/sec_identificacao/questions \
  -H "Content-Type: application/json" \
  -d '{"id": "q_errada", "title": "Sexo", "type": "ESTIMULADA"}'
```

```json
{"detail":[{"type":"value_error","loc":["body"],
  "msg":"Value error, Perguntas do tipo ESTIMULADA ou MULTIPLA devem ter options", ...}]}
```

Outras mensagens que você pode ver (todas `422`):

- `Perguntas do tipo ABERTA não devem ter options`
- `Perguntas do tipo COMPOSTA devem ter compositeFields`
- `inputFormat só é permitido em perguntas ABERTA`
- `Opções com hasComplement=True devem informar complementLabel`

E ainda: seção inexistente → `404`; id de pergunta repetido → `400`.

---

## Caso de uso 6 — Consultar a estrutura montada

Pra "desenhar" o formulário inteiro, a leitura é feita em camadas:

### Passo 1: seções do formulário (na ordem)

```bash
curl http://localhost:8000/api/v1/forms/form_010/sections
```

```json
{
  "form_id": "form_010",
  "sections": [{
    "_id": "sec_identificacao",
    "title": "Identificação",
    "parentItem": "form_010",
    "subSections": [],
    "questions": ["q_nome","q_nasc","q_alergia","q_sintomas","q_pa_sist","q_pa_diast","q_pa"],
    "tags": ["identificacao"]
  }]
}
```

### Passo 2: perguntas de cada seção (na ordem)

```bash
curl http://localhost:8000/api/v1/sections/sec_identificacao/questions
```

```json
{
  "section_id": "sec_identificacao",
  "questions": [
    {"_id":"q_nome","title":"Nome completo","type":"ABERTA", ...},
    {"_id":"q_nasc","title":"Data de nascimento","type":"ABERTA","inputFormat":"data", ...},
    {"_id":"q_alergia","title":"Possui alguma alergia?","type":"ESTIMULADA","options":[...], ...},
    ...
  ]
}
```

### Passo 3 (opcional): uma pergunta isolada

```bash
curl http://localhost:8000/api/v1/questions/q_alergia
```

Resumo do caminho: **`/forms/{id}` → `/forms/{id}/sections` → `/sections/{id}/questions`**. É exatamente isso que o frontend faz pra montar a tela de preenchimento.

---

## Caso de uso 7 — Editar formulário e perguntas

Os `PUT` **substituem o objeto inteiro** (não é edição parcial). Então mande **todos** os campos, mesmo os que não mudaram — o que você omitir volta pro valor padrão (lista vazia, `null`...).

### 7.1 Editar uma pergunta

Mudar o título de `q_nome`:

```bash
curl -X PUT http://localhost:8000/api/v1/questions/q_nome \
  -H "Content-Type: application/json" \
  -d '{"title": "Nome completo do paciente", "type": "ABERTA"}'
```

```json
{"_id":"q_nome","parentItem":"sec_identificacao","title":"Nome completo do paciente",
 "type":"ABERTA","options":[],"compositeFields":[],"inputFormat":null}
```

- O `id` vai **na URL**, não no corpo (e não dá pra mudar o id).
- As mesmas regras por tipo do caso de uso 5 valem aqui.

### 7.2 Editar um formulário (ex.: subir a versão)

```bash
curl -X PUT http://localhost:8000/api/v1/forms/form_010 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Triagem de Enfermagem",
    "sections": ["sec_identificacao"],
    "metadata": {"version": "1.1", "active": true}
  }'
```

> ⚠️ **Cuidado com `sections`:** se você mandar a lista vazia (ou esquecer uma seção), o formulário "perde" a referência a ela — a seção continua no banco, mas some da tela. Sempre copie a lista atual (`GET /forms/{id}`) antes de editar. Esse também é o único jeito de **reordenar** seções.

> Não existe rota pra editar uma **seção** (título, tags, ordem das perguntas). Veja [Limitações](#limitações-conhecidas).

---

## Caso de uso 8 — Registrar um preenchimento (submissão)

A submissão é **um formulário preenchido pra um paciente**. A API aceita um formato bem flexível — ela **não confere** se as respostas batem com as perguntas do formulário. Quem garante a coerência é quem envia (normalmente o frontend).

### Passo 1: monte o corpo

| Campo | Obrigatório | O que vai nele |
|---|---|---|
| `formId` | **sim** | Id do formulário preenchido (ex.: `form_010`) |
| `formName` | não | Nome do formulário (útil pra exibição) |
| `entity` | não | Instituição/unidade (ex.: `ent_huac`) |
| `patientData` | não | Dados do paciente — objeto livre |
| `answers` | não | Respostas: `id → valor` (texto, número, booleano, lista de textos ou `null`) |
| `checkboxAnswers` | não | Marcações: `id → true/false` |
| `closingData` | não | Dados de encerramento (data, responsável...) — objeto livre |
| `status` | não | `"completed"` (padrão) ou `"draft"` (rascunho) |

**Convenção usada pelo frontend** (siga-a pra que a tela de submissões mostre tudo direitinho):

- `ABERTA` → `answers["q_nome"] = "Maria"`
- `ESTIMULADA` → `answers["q_alergia"] = "sim"` (o `value` da opção escolhida)
- `MULTIPLA` → `checkboxAnswers["febre"] = true` (uma chave por `value` de opção marcada)
- Complemento de opção → `answers["<value>_complement"]` (ex.: `answers["sim_complement"] = "Dipirona"`)

### Passo 2: envie

```bash
curl -X POST http://localhost:8000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "form_010",
    "formName": "Triagem de Enfermagem",
    "entity": "ent_huac",
    "patientData": {"name": "Paciente Teste", "record": "000123"},
    "answers": {
      "q_nome": "Paciente Teste",
      "q_nasc": "1990-01-15",
      "q_alergia": "sim",
      "sim_complement": "Dipirona",
      "q_pa_sist": 120,
      "q_pa_diast": 80
    },
    "checkboxAnswers": {"febre": true, "tosse": true},
    "closingData": {"date": "2026-09-29", "responsible": "Enf. Fulana"},
    "status": "completed"
  }'
```

**Resposta — `201 Created`:**

```json
{
  "formId": "form_010",
  "formName": "Triagem de Enfermagem",
  "entity": "ent_huac",
  "patientData": {"name": "Paciente Teste", "record": "000123"},
  "answers": {"q_nome": "Paciente Teste", ...},
  "checkboxAnswers": {"febre": true, "tosse": true},
  "closingData": {"date": "2026-09-29", "responsible": "Enf. Fulana"},
  "status": "completed",
  "_id": "6abbc5e04056bc20de740b6a",
  "submittedAt": "2026-09-29T14:06:24.125489Z"
}
```

Guarde o **`_id`**: é com ele que você consulta ou apaga essa submissão. O `submittedAt` é preenchido pelo servidor (em UTC).

### Passo 3 (opcional): salvar um rascunho

Só o `formId` já basta:

```bash
curl -X POST http://localhost:8000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -d '{"formId": "form_010", "answers": {"q_nome": "Outro paciente"}, "status": "draft"}'
```

> Não existe rota pra **editar** uma submissão. Pra "finalizar" um rascunho, crie uma nova submissão com `status: "completed"` e apague o rascunho.

### O que pode dar errado

- `status` diferente de `draft`/`completed` → `422` `"Input should be 'draft' or 'completed'"`
- Faltou `formId` → `422` `"Field required"`
- Campo desconhecido no nível de cima (ex.: `"observacao": "..."`) → `422` `"Extra inputs are not permitted"`. Coloque dados extras dentro de `patientData` ou `closingData`, que aceitam qualquer chave.

---

## Caso de uso 9 — Listar, filtrar e consultar submissões

### Passo 1: listar (mais recentes primeiro)

```bash
curl http://localhost:8000/api/v1/submissions
```

### Passo 2: filtrar

Filtros disponíveis (combináveis): `formId`, `entity`, `status` e `limit` (padrão 100, máximo 500).

```bash
# rascunhos do form_010
curl "http://localhost:8000/api/v1/submissions?formId=form_010&status=draft"

# as 10 mais recentes do HUAC
curl "http://localhost:8000/api/v1/submissions?entity=ent_huac&limit=10"
```

```json
{
  "submissions": [{
    "formId": "form_010", "formName": null, "entity": null,
    "patientData": {}, "answers": {"q_nome": "Outro paciente"},
    "checkboxAnswers": {}, "closingData": {}, "status": "draft",
    "_id": "6abbc5e04056bc20de740b6b", "submittedAt": "2026-09-29T14:06:24.141000"
  }]
}
```

> Filtro sem resultado devolve `{"submissions": []}` com `200` — **não** é erro. Lembre das aspas na URL no terminal por causa do `&`.

### Passo 3: consultar uma submissão pelo id

```bash
curl http://localhost:8000/api/v1/submissions/6abbc5e04056bc20de740b6a
```

Id inexistente **ou** mal formado (ex.: `abc`) → `404` `{"detail":"Submissão não encontrada"}`.

---

## Caso de uso 10 — Remover submissão

```bash
curl -X DELETE http://localhost:8000/api/v1/submissions/6abbc5e04056bc20de740b6b
```

```json
{"mensagem":"Submissão removida com sucesso","id":"6abbc5e04056bc20de740b6b"}
```

É definitivo — não tem lixeira.

---

## Caso de uso 11 — Remover pergunta, seção e formulário

A remoção tem uma **ordem certa**, de dentro pra fora: **perguntas → seções → formulário**.

```
1. DELETE /questions/{id}   (uma por uma)
2. DELETE /sections/{id}    (só funciona com a seção vazia)
3. DELETE /forms/{id}
```

### Passo 1: remover perguntas

```bash
curl -X DELETE http://localhost:8000/api/v1/questions/q_nome
```

```json
{"mensagem":"Pergunta removida com sucesso","id":"q_nome"}
```

A API também tira `q_nome` da lista `questions` da seção. Repita pra cada pergunta (`q_nasc`, `q_alergia`, `q_sintomas`, `q_pa`, `q_pa_sist`, `q_pa_diast`).

> Dica: apague a `COMPOSTA` (`q_pa`) antes das filhas, pra ela não ficar apontando pra perguntas que não existem mais.

### Passo 2: remover a seção

```bash
curl -X DELETE http://localhost:8000/api/v1/sections/sec_identificacao
```

```json
{"mensagem":"Seção removida com sucesso","id":"sec_identificacao"}
```

Se ainda tiver pergunta dentro, a API **se recusa** (proteção contra apagar sem querer):

```json
{"detail":"Não é possível remover a seção porque ela possui perguntas associadas"}
```

O mesmo vale pra seção com subseções.

### Passo 3: remover o formulário

```bash
curl -X DELETE http://localhost:8000/api/v1/forms/form_010
```

```json
{"mensagem":"Formulário removido com sucesso","id":"form_010"}
```

> ⚠️ **Atenção:** diferente da seção, o `DELETE /forms/{id}` **não verifica** se ainda há seções dentro. Se você apagar o formulário direto, as seções e perguntas dele ficam "órfãs" no banco (continuam existindo, mas nenhum formulário aponta pra elas). As submissões daquele formulário também **não** são apagadas. Por isso, siga a ordem acima.

---

## Caso de uso 12 — Extrair dados clínicos com o Vision Engine (LLM)

O **Vision Engine** é um serviço separado que manda um texto clínico (e, se quiser, uma imagem, PDF ou CSV) pra um modelo de linguagem rodando no **Ollama** e devolve os dados organizados em seções e campos. A API principal funciona como "ponte" pra ele.

### Pré-requisitos

- Sistema completo rodando (`docker compose up -d --build` na raiz).
- O modelo configurado no `docker-compose.yml` (`OLLAMA_MODEL` do serviço `vision-engine`) baixado dentro do Ollama, por exemplo:
  ```bash
  docker exec -it assis_ollama ollama pull gemma2:9b
  ```

### Como funciona (assíncrono)

O processamento da LLM pode levar de segundos a minutos, então o fluxo é em **duas etapas**:

```
1. POST /vision/processar-clinica   → recebe um id_sessao (status "pending")
2. GET  /vision/status/{id_sessao}  → pergunta de novo até virar "executed" ou "failed"
```

### Autenticação

Essas rotas exigem um **token Bearer**. O valor fica na variável `VISION_API_SECRET_TOKEN` (no ambiente de desenvolvimento é `0000`). Sem ele:

- sem cabeçalho → `401` `"Token de autenticação ausente."`
- token errado → `401` `"Token de autenticação inválido."`

### Passo 1: enviar o texto (e opcionalmente um arquivo)

Aqui o corpo é **formulário multipart** (`-F`), não JSON:

```bash
# só texto
curl -X POST http://localhost:8000/api/v1/vision/processar-clinica \
  -H "Authorization: Bearer 0000" \
  -F "texto_clinico=Paciente de 45 anos, PA 140x90, refere cefaleia há 3 dias."

# texto + arquivo (png, jpg, jpeg, webp, pdf ou csv)
curl -X POST http://localhost:8000/api/v1/vision/processar-clinica \
  -H "Authorization: Bearer 0000" \
  -F "texto_clinico=Transcreva a ficha anexada" \
  -F "file=@/caminho/para/ficha.png"
```

```json
{
  "mensagem": "Requisição empilhada com sucesso.",
  "id_sessao": "3f2b0c1e-....",
  "status": "pending",
  "link_consulta": "/api/v1/status/3f2b0c1e-...."
}
```

> O `link_consulta` aponta pro caminho **interno** do Vision Engine. Pela API principal, use `/api/v1/vision/status/{id_sessao}` (passo 2).

### Passo 2: consultar o resultado

```bash
curl http://localhost:8000/api/v1/vision/status/3f2b0c1e-.... \
  -H "Authorization: Bearer 0000"
```

Possíveis respostas:

- **Ainda processando:** `{"status": "pending", "criado_em": "..."}` → espere alguns segundos e pergunte de novo.
- **Pronto:**
  ```json
  {
    "status": "executed",
    "dados": {
      "tipo_documento": "Evolução clínica",
      "secoes": [{
        "titulo_secao": "Sinais vitais",
        "campos": [
          {"campo_id": "pressao_arterial", "label": "Pressão arterial",
           "valor": "140x90", "tipo_componente": "texto"}
        ]
      }],
      "resumo_narrativo": "Paciente de 45 anos com cefaleia há 3 dias...",
      "criado_em": "..."
    }
  }
  ```
- **Falhou:** `{"status": "failed", "erro": "...", "detalhes": [...]}` — geralmente a LLM não seguiu o formato esperado, ou o modelo não está baixado no Ollama.

### Passo 3 (opcional): listar sessões

```bash
curl http://localhost:8000/api/v1/vision/sessoes -H "Authorization: Bearer 0000"
```

> As sessões ficam **na memória** do Vision Engine por até 7 dias. Se o container reiniciar, elas somem e a consulta devolve `404`.

### Se o Vision Engine não estiver no ar

`503` `{"detail":"Não foi possível conectar ao Motor de Visão: ..."}`. Isso acontece, por exemplo, quando você subiu só API + banco (jeito A).

---

## Erros comuns e como resolver

| Código | O que significa | Exemplo de causa | O que fazer |
|---|---|---|---|
| `400` | Regra de negócio violada | Id repetido; seção com perguntas | Leia o `detail`; escolha outro id ou apague os filhos antes |
| `401` | Sem autorização | Faltou `Authorization: Bearer 0000` nas rotas `/vision` | Inclua o cabeçalho com o token certo |
| `404` | Não encontrado | Id digitado errado; recurso já apagado | Confira o id com um `GET` de listagem |
| `422` | Corpo inválido | Campo obrigatório faltando, campo extra, id fora do padrão, regra de tipo de pergunta | O `detail` diz o campo (`loc`) e o motivo (`msg`) |
| `500` | Erro interno | Banco fora do ar; dados inconsistentes no Mongo | Veja os logs: `docker compose logs -f api` |
| `503` | Serviço dependente fora | Vision Engine/Ollama não está rodando | Suba o sistema completo |

**Como ler um `422`:**

```json
{"detail":[{"loc":["body","metadata","version"],"msg":"Field required", ...}]}
```

`loc` é o "caminho" até o campo com problema (aqui: `metadata.version` do corpo) e `msg` diz o que está errado.

---

## Limitações conhecidas

Coisas que a API **ainda não faz** hoje — bom saber antes de tentar:

1. **Não há rota pra editar seção** (`PUT /sections/{id}`): não dá pra renomear uma seção, mudar as tags ou reordenar as perguntas dela pela API.
2. **Subseções não têm rota própria de criação.** A única forma de criar seção é `POST /forms/{id}/sections`, que sempre coloca o formulário como pai. O campo `subSections` existe, mas não há um fluxo pela API pra montar uma seção dentro de outra.
3. **Apagar formulário não apaga em cascata** (seções, perguntas e submissões continuam no banco).
4. **Submissões não são validadas** contra a estrutura do formulário — dá pra mandar respostas pra perguntas que não existem.
5. **Não há edição de submissão** (só criar, consultar e apagar).
6. **`compositeFields` não é validado** — ids inexistentes são aceitos.
7. **Ids de formulário são limitados a `form_000`–`form_999`**, escolhidos manualmente (a API não gera o próximo id livre).
8. **Autenticação** existe só nas rotas `/vision` (e com um token fixo). As demais rotas são abertas.
9. **Resultado do Vision Engine vai pra coleção `forms`** com um formato diferente dos formulários normais (id em UUID e seções como objetos). Isso pode fazer a listagem `GET /forms` falhar com `500` depois de um processamento bem-sucedido. Se acontecer, remova esses documentos direto no Mongo.

---

## Cola rápida (todos os endpoints)

Base: `http://localhost:8000/api/v1`

| Método | Rota | O que faz | Sucesso |
|---|---|---|---|
| GET | `/` *(sem prefixo)* | Health check | 200 |
| GET | `/forms` | Lista formulários (resumo + `questionCount`) | 200 |
| POST | `/forms` | Cria formulário | 201 |
| GET | `/forms/{form_id}` | Busca formulário | 200 |
| PUT | `/forms/{form_id}` | Substitui formulário | 200 |
| DELETE | `/forms/{form_id}` | Remove formulário (sem cascata) | 200 |
| GET | `/forms/{form_id}/sections` | Lista seções do formulário (em ordem) | 200 |
| POST | `/forms/{form_id}/sections` | Cria seção no formulário | 201 |
| DELETE | `/sections/{section_id}` | Remove seção (precisa estar vazia) | 200 |
| GET | `/sections/{section_id}/questions` | Lista perguntas da seção (em ordem) | 200 |
| POST | `/sections/{section_id}/questions` | Cria pergunta na seção | 201 |
| GET | `/questions/{question_id}` | Busca pergunta | 200 |
| PUT | `/questions/{question_id}` | Substitui pergunta | 200 |
| DELETE | `/questions/{question_id}` | Remove pergunta | 200 |
| POST | `/submissions` | Salva formulário preenchido | 201 |
| GET | `/submissions?formId=&entity=&status=&limit=` | Lista/filtra submissões | 200 |
| GET | `/submissions/{submission_id}` | Busca submissão | 200 |
| DELETE | `/submissions/{submission_id}` | Remove submissão | 200 |
| POST | `/vision/processar-clinica` 🔒 | Envia texto/arquivo pra LLM | 200 |
| GET | `/vision/status/{id_sessao}` 🔒 | Consulta resultado da LLM | 200 |
| GET | `/vision/sessoes` 🔒 | Lista sessões da LLM | 200 |

🔒 = exige `Authorization: Bearer <VISION_API_SECRET_TOKEN>`

---

*Referências no código:* `backend/api/routers/` (rotas), `backend/api/models/` (regras de validação), `backend/vision-engine/main.py` (Vision Engine), `backend/SUBMISSIONS_API_EXAMPLES.md` (exemplos extras de submissões, em inglês).
