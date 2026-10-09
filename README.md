# NeuroKid

**Proteção cognitiva invisível contra hiperestimulação digital infantil**, com um painel parental calmo e não intrusivo.

App mobile (iOS/Android) para pais e responsáveis de crianças de **2 a 12 anos**. O NeuroKid lê o *ritmo* do que aparece na tela — cortes de cena, picos de áudio, intensidade de cor — e intervém com suavidade antes da sobrecarga sensorial, em vez de punir tempo de tela.

---

## Sumário

- [Princípios de produto](#princípios-de-produto)
- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Telas](#telas)
- [Design system](#design-system)
- [Autenticação](#autenticação)
- [API](#api)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar](#como-rodar)
- [Dados de demonstração](#dados-de-demonstração)
- [Segurança](#segurança)
- [Publicação e builds](#publicação-e-builds)
- [Roadmap](#roadmap)

---

## Princípios de produto

| Decisão | Por quê |
|---|---|
| **Soft Landing de 12s** | Corte seco de vídeo gera birra. A tela esfria a saturação, o áudio baixa gradualmente e uma animação de respiração convida à pausa (ou troca automática por Slow Content). |
| **Pílula Quick-Child** | Troca de perfil instantânea no topo do painel, sem menus profundos. Os limiares sensoriais mudam junto com a faixa etária (Bebês 2-4, Exploradores 5-8, Pré-adolescentes 9-12). |
| **Anti-fadiga de alertas** | Só intervenções críticas aparecem em tempo real. Picos leves são agrupados no **Resumo de Descanso** da noite, para não gerar hipervigilância nem culpa. |
| **Tour do Escudo Cognitivo** | As permissões sensíveis são explicadas em 3 metáforas visuais: Filtro Cognitivo (não é vigilância), Cofre de Privacidade (modelos locais, retenção zero) e Guardião de Bateria (menos de 1% ao dia). |
| **Tom acolhedor** | Zero vermelho alarmista, zero transição brusca: easing suave de 350ms, pulso de respiração de 4s e textos de apoio, nunca de punição. |

---

## Stack

| Camada | Tecnologia |
|---|---|
| App | React Native + **Expo SDK 57**, TypeScript, expo-router (rotas por arquivo) |
| Animação | react-native-reanimated, react-native-svg (gráfico de onda sensorial) |
| Ícones / fontes | `@react-native-vector-icons/feather`, Plus Jakarta Sans via `expo-font` |
| Teclado | react-native-keyboard-controller (`KeyboardAwareScrollView`) |
| Backend | **FastAPI** (Python, async), Motor |
| Banco | **MongoDB** (telemetria sensorial, sessões, perfis, alertas) |
| IA | **Gemini 3 Flash** via Universal Key da Emergent (classificação de ritmo/carga sensorial) |
| Auth | JWT (e-mail + senha) **e** Google gerenciado pela Emergent |

---

## Estrutura do projeto

```text
/app
├── backend/
│   ├── server.py            # API FastAPI completa (auth, telemetria, acervo, IA, relatórios)
│   ├── requirements.txt
│   ├── .env                 # NUNCA versionado
│   └── .env.example
├── frontend/
│   ├── app/                 # rotas (expo-router)
│   │   ├── _layout.tsx      # fontes, providers, Stack raiz
│   │   ├── index.tsx        # gate: onboarding → auth → tabs
│   │   ├── onboarding.tsx   # Tour do Escudo Cognitivo (3 etapas)
│   │   ├── auth.tsx         # entrar / criar conta / Google
│   │   ├── soft-landing.tsx # overlay de 12s da criança
│   │   ├── content/[id].tsx # card explicativo da IA
│   │   └── (tabs)/          # Início, Alertas, Acervo, Semana
│   ├── src/
│   │   ├── api/client.ts    # fetch + tipos
│   │   ├── components/      # Base, Card, Pill, ShieldBadge, SensoryWave, Toast, ChildSwitcher
│   │   ├── context/         # AuthContext (JWT + sessão Google)
│   │   ├── hooks/           # prewarm da fonte de ícones
│   │   ├── theme/tokens.ts  # cores, espaçamentos, raios, tipografia
│   │   └── utils/storage/   # armazenamento seguro multiplataforma
│   ├── app.json
│   └── .env.example
├── design_guidelines.json   # blueprint de UI/UX
└── .gitignore               # hardening de segredos, caches e artefatos
```

---

## Telas

1. **Painel (Início)** — pílula Quick-Child, status do escudo, badge de proteção com pulso de respiração, tempo de tela do dia com barra, índice de carga sensorial (baixo/moderado/alto + gráfico de onda) e ações rápidas (pausa + demo do Soft Landing).
2. **Alertas** — feed agrupado por dia, pílulas por severidade (Interrupção automática, Transição de atenção, Resumo de Descanso), ação tomada em cada evento e "Limpar tudo".
3. **Detalhe do conteúdo** — propósito e impacto cognitivo: ritmo, cortes/min, selos de estímulo verificado, "Por que a IA aprovou isto", carga sensorial e dica para os pais.
4. **Acervo Slow Content** — filtros por faixa etária, cartões com cortes/min e notas de áudio, inclusão na lista permitida da criança.
5. **Semana** — horas totais com variação vs. semana anterior, picos interceptados, score de equilíbrio cognitivo, ritmo diário em barras e atividades offline recomendadas com agendamento.
6. **Soft Landing** — tela da criança: contagem de 12s, respiração animada, saturação esfriando, etapas concluídas e troca por Slow Content.

---

## Design system

Tokens centralizados em `frontend/src/theme/tokens.ts` (espelham `design_guidelines.json`).

| Token | Valor |
|---|---|
| Primária (Teal Nature) | `#145C68` / `#1B7A82` |
| Secundária (Botanical Soft) | `#2A9D8F` / `#48A9A6` |
| Fundo / Superfície | `#FFFFFF` / `#F8F9FA` |
| Acento moderado | `#E9C46A` / `#F4A261` |
| Acento crítico | `#E76F51` |
| Texto | `#212529` / `#6C757D` |
| Raios | cartões 18 • botões 12 • pílulas 999 |
| Elevação | `0 8px 24px rgba(20, 92, 104, 0.06)` |
| Tipografia | Plus Jakarta Sans — 32/20/16/14/12 |

> Nenhum componente usa cor literal: tudo vem de `colors`/`type` dos tokens.

---

## Autenticação

Dois caminhos, uma mesma sessão:

- **E-mail + senha (JWT)** — hash bcrypt, token HS256 de 7 dias.
- **Google gerenciado pela Emergent** — o app abre `https://auth.emergentagent.com/?redirect=<url>`; o `session_id` retornado é trocado por um `session_token` de 7 dias em `POST /api/auth/session`, guardado em `user_sessions` (índice TTL).

O middleware `current_parent` aceita **os dois formatos** de bearer token: primeiro tenta decodificar como JWT, depois procura o token em `user_sessions`. O app guarda o token com `storage.secureSet` (SecureStore no mobile, localStorage no web) e envia em `Authorization: Bearer`.

---

## API

Todas as rotas usam o prefixo `/api`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Healthcheck + ping no Mongo |
| `POST` | `/auth/register` | Cria responsável (recebe uma criança com histórico) |
| `POST` | `/auth/login` | Login com e-mail e senha → JWT |
| `POST` | `/auth/session` | Troca `session_id` do Google por `session_token` |
| `POST` | `/auth/logout` | Encerra a sessão Google |
| `GET` | `/auth/me` | Dados do responsável autenticado |
| `GET/POST` | `/children` | Lista / cria perfis infantis |
| `PATCH` | `/children/{id}/shield` | Liga ou pausa o escudo |
| `GET` | `/children/{id}/dashboard` | Tempo de tela, índice sensorial e onda do dia |
| `GET` | `/children/{id}/alerts` | Feed agrupado por dia |
| `POST` | `/children/{id}/alerts/clear` | Limpa o feed (o histórico fica no relatório) |
| `POST` | `/children/{id}/soft-landing` | Registra uma intervenção de 12s |
| `POST` | `/children/{id}/screen-break` | Inicia uma pausa gentil de 15 min |
| `GET` | `/children/{id}/weekly-report` | Resumo semanal + atividades offline |
| `POST` | `/children/{id}/offline-reminder` | Agenda uma atividade offline |
| `GET` | `/content` | Acervo Slow Content (filtro `bracket`, `child_id`) |
| `GET` | `/content/{id}` | Detalhe do conteúdo |
| `POST` | `/content/{id}/allow` | Adiciona/remove da lista permitida |
| `POST` | `/content/{id}/classify` | Releitura cognitiva com Gemini 3 Flash |

A classificação por IA degrada com elegância: se o modelo falhar, o analisador de ritmo local responde com a mesma estrutura, sem erro na interface.

---

## Variáveis de ambiente

Copie os exemplos e preencha (`.env` nunca é versionado):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

| Chave | Uso |
|---|---|
| `MONGO_URL` | Conexão com o MongoDB |
| `DB_NAME` | Nome do banco |
| `JWT_SECRET` | Assinatura dos tokens (`openssl rand -hex 32`) |
| `JWT_EXPIRE_MINUTES` | Validade do JWT (padrão 10080 = 7 dias) |
| `EMERGENT_LLM_KEY` | Universal Key para o Gemini 3 Flash |

**frontend/.env**

| Chave | Uso |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | URL pública do backend (o app acrescenta `/api`) |
| `EXPO_PACKAGER_PROXY_URL`, `EXPO_PACKAGER_HOSTNAME` | Gerenciadas pela plataforma — **não editar** |

---

## Como rodar

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# App
cd frontend
yarn install
yarn expo start
```

No ambiente Emergent, os dois serviços já sobem pelo supervisor:

```bash
sudo supervisorctl restart backend expo
tail -n 100 /var/log/supervisor/backend.err.log
```

Abra o app pelo **QR code do Expo Go** ou pelo preview web (use a mesma origem do `EXPO_PUBLIC_BACKEND_URL` no navegador para evitar bloqueio de CORS).

---

## Dados de demonstração

Na primeira subida o backend semeia tudo em **português (pt-BR)**: 6 títulos de Slow Content, 3 crianças e 7 dias de telemetria com alertas coerentes. O dia corrente é completado automaticamente para o painel nunca aparecer vazio.

```text
E-mail: parent@neurokid.app
Senha:  NeuroKid2026!
Crianças: Leo (5a) • Mia (3a) • Nina (10a)
```

A tela de login tem o atalho **"Usar a família demo"**. Novas contas recebem uma criança com histórico próprio.

---

## Segurança

- `.gitignore` na raiz bloqueia `.env` em **qualquer** nível, além de chaves (`*.pem`, `*.key`, `google-services.json`), `node_modules/`, ambientes virtuais Python, `__pycache__/`, `.pytest_cache/`, builds e arquivos de SO.
- Senhas com bcrypt; tokens JWT HS256; sessões Google com expiração por TTL no Mongo.
- Nenhuma URL, porta ou credencial fica no código — tudo vem de `.env`.
- Toda rota de dados exige o responsável autenticado **e** valida a posse do perfil infantil antes de responder.

---

## Publicação e builds

Use o botão **Publish** (canto superior direito) na plataforma Emergent para publicar e gerar os builds iOS/Android. O `eas.json` é gerenciado pela plataforma e não deve ser editado.

---

## Roadmap

- [ ] Captura real de telemetria sensorial no sistema operacional (serviço em background)
- [ ] Resumo de Descanso enviado à noite por notificação
- [ ] Vários responsáveis compartilhando o mesmo perfil infantil
- [ ] Modo escuro seguindo os mesmos tokens
- [ ] Exportar o relatório semanal em PDF para pediatras

---

Feito com cuidado para reduzir estímulo, não tempo de convivência.
