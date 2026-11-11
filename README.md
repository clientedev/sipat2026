# Plataforma Oficial SIPAT 2026 – Escola SENAI "Morvan Figueiredo"

Plataforma web institucional gamificada desenvolvida para a **Semana Interna de Prevenção de Acidentes do Trabalho (SIPAT 2026)** da **Escola SENAI "Morvan Figueiredo"**, realizada de **16 a 19 de novembro de 2026**.

- **Tema Oficial:** *"Segurança começa com você: prevenir é uma atitude de todos!"*
- **Slogan Oficial:** *"Sua atitude faz a diferença!"*

---

## Como o sistema funciona (rede social dos alunos)

1. **A coordenação cadastra atividades** (missões e quizzes) com pontuação, dia, turmas-alvo e laboratório.
2. **O aluno participa** pela aba *Atividades* (foto, vídeo, texto, Caça aos Riscos, 7 Erros, quiz).
3. **O professor/avaliador aprova** na *Central de Evidências*. Só então os pontos entram, o nível sobe e as medalhas são liberadas.
4. **A participação aprovada vira uma publicação no Mural** (se o aluno marcou "publicar no mural"). Colegas **curtem (1 por pessoa) e comentam**; o autor é notificado. Curtidas e comentários **não valem pontos** — os pontos vêm só das atividades cadastradas.
5. **Ranking** da escola, da turma e entre turmas; **perfil** de cada aluno com bio, medalhas, posts e curtidas recebidas.
6. **Moderação:** a equipe oculta publicações/comentários inadequados (registrado na auditoria); o dono do post pode ocultar comentários nele; o aluno pode tirar o próprio post do mural.
7. **Privacidade (LGPD):** fotos/vídeos só aparecem no mural se o autor autorizou uso de imagem; a vitrine pública (página inicial/TV) mostra apenas posts marcados como *Destaque* pela equipe.

### Perfis de acesso (um único login em `/login`)

| Perfil | Como entra | Para onde vai | O que faz |
| :--- | :--- | :--- | :--- |
| **Aluno** (`PARTICIPANT`) | Cria a conta em `/inscricao` (QR Code ou link) e entra com **RA ou e-mail** | `/app` | Mural, Atividades, Ranking, Perfil, certificado |
| **Professor / Avaliador** (`EVALUATOR`) | E-mail criado pela coordenação | `/admin` | Avalia participações e modera o mural |
| **Coordenação** (`ADMIN`) | E-mail criado pelo superadmin | `/admin` | Atividades, turmas, alunos, QR, certificados, relatórios |
| **Superadmin** (`SUPER_ADMIN`) | Criado no 1º deploy (`INITIAL_ADMIN_*`) | `/admin` | Tudo acima + contas da equipe e senhas |

Alunos recuperam a senha sozinhos (e-mail + RA); a equipe pede a redefinição ao superadmin.

---

## 1. Arquitetura e Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend & PWA** | React 19, TypeScript, Vite, Tailwind CSS, React Router, Lucide Icons, Socket.IO Client, Service Worker + Web App Manifest |
| **Backend & Tempo Real** | Node.js (>= 20), Express, TypeScript, REST API + Socket.IO (WebSockets), Agendador Automático Persistente |
| **Banco de Dados** | PostgreSQL + Prisma ORM (migrations versionadas em `prisma/migrations/`) |
| **Armazenamento de Mídia** | Armazenamento externo de objetos compatível com S3 (`@aws-sdk/client-s3` — Cloudflare R2, AWS S3, Railway Storage Bucket, MinIO), com URLs assinadas e validação binária (magic bytes) |
| **Relatórios & QR Code** | ExcelJS (`.xlsx`), SheetJS (`importação .xlsx/.csv`), PDFKit (`.pdf`), `qrcode` (PNG e Cartaz A4 institucional em PDF) |
| **Segurança & LGPD** | Hash `bcryptjs`, JWT (`HttpOnly` Cookie + Bearer), Helmet, Rate Limiting, Zod, RBAC (`SUPER_ADMIN`, `ADMIN`, `EVALUATOR`, `PARTICIPANT`), evidências privadas por padrão e logs imutáveis de auditoria |

---

## 2. Endereços e Ambientes da Plataforma

| Rota | Ambiente | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `/` | **Página Inicial da Campanha** | Pública | Apresentação institucional da SIPAT 2026, objetivos pedagógicos, programação dos 4 dias (16–19/11), medalhas e QR Code de inscrição. |
| `/inscricao` (`/inscricao?code=...`) | **Cadastro Mobile via QR Code** | Pública | Formulário otimizado para smartphones com captura direta de foto pela câmera, escolha de turma, consentimento LGPD/menores e login automático. |
| `/login` | **Autenticação e Recuperação** | Pública | Login para alunos, colaboradores, avaliadores e administradores, além de recuperação segura de acesso. |
| `/app` | **Rede Social do Aluno** | Participante | Mural (curtidas e comentários), Atividades (missões e quizzes), Ranking (escola/turma/turmas) e Perfil (bio, medalhas, extrato, certificado, LGPD). |
| `/ranking` | **Ranking Ao Vivo & Modo TV** | Pública | Placar em tempo real (Individual, por Turmas e Destaques do Dia) com **Modo Apresentação Tela Cheia** e alternância automática para TVs e projetores da escola. |
| `/acompanhamento` | **Painel Público Geral** | Pública | Indicadores em tempo real de inscritos, taxa de participação, evidências enviadas, missões concluídas, pontuação acumulada e evolução diária. |
| `/admin` | **Painel Administrativo & Avaliador** | Staff (`EVALUATOR`, `ADMIN`, `SUPER_ADMIN`) | Gestão completa de inscrições/QR Code, turmas, participantes (manual + planilha), missões, agendador automático, quizzes, central de aprovação de evidências, auditoria e relatórios Excel/PDF. |
| `/api/health` | **Endpoint de Saúde** | Pública | Healthcheck de produção validando conexão ativa com PostgreSQL, agendador e driver de armazenamento. |

---

## 3. Identidade Institucional e Marca Oficial SENAI

Em respeito rigoroso às diretrizes de identidade visual do SENAI, a plataforma **não inventa nem distorce versões artificiais do logotipo**. A aplicação está preparada para receber o arquivo original homologado da marca de duas formas:

1. **Pelo Painel Administrativo (Recomendado em Produção):** Acesse `/admin` → **Relatórios, Marca & LGPD** → **Enviar Arquivo Oficial da Marca (`.svg` ou `.png`)**.
2. **Via Repositório:** Adicione o arquivo oficial em `public/brand/senai-oficial.svg`.

---

## 4. Publicação no Railway (Produção com PostgreSQL)

O repositório já contém [`Dockerfile`](./Dockerfile), [`railway.json`](./railway.json), [`.dockerignore`](./.dockerignore), migrations do Prisma e healthcheck configurados especificamente para o **Railway**.

### Passo 1: Criar o Projeto e o PostgreSQL no Railway
1. No painel do [Railway](https://railway.app), clique em **New Project** → **Deploy from GitHub repo** e selecione `clientedev/sipat2026`.
2. No mesmo projeto do Railway, clique em **+ New** → **Database** → **Add PostgreSQL**.

### Passo 2: Configurar as Variáveis de Ambiente no Serviço da Aplicação
Na aba **Variables** do serviço web no Railway, configure (baseando-se no arquivo [`.env.example`](./.env.example)):

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
PUBLIC_APP_URL=https://<seu-dominio-gerado>.up.railway.app
JWT_SECRET=<gere-uma-chave-forte-com-openssl-rand-hex-32>
COOKIE_SECURE=true

# Credenciais para criação automática do primeiro Superadministrador no 1º deploy:
INITIAL_ADMIN_NAME="Coordenação SIPAT - SENAI Morvan Figueiredo"
INITIAL_ADMIN_EMAIL="admin.sipat@senai.br"
INITIAL_ADMIN_PASSWORD="<defina-uma-senha-inicial-forte>"

INITIAL_EVALUATOR_NAME="Comissão Avaliadora CIPA / Docentes"
INITIAL_EVALUATOR_EMAIL="avaliador.sipat@senai.br"
INITIAL_EVALUATOR_PASSWORD="<defina-uma-senha-forte-do-avaliador>"

# Armazenamento Externo de Objetos S3-compatível (Cloudflare R2 / AWS S3 / Railway Bucket)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=sipat2026-evidencias
S3_ACCESS_KEY_ID=<sua-access-key>
S3_SECRET_ACCESS_KEY=<sua-secret-key>
S3_FORCE_PATH_STYLE=false
```

> **Nota sobre a porta (`PORT`):** Não é necessário fixar `PORT` manualmente. O servidor lê automaticamente `process.env.PORT` injetada pelo Railway e faz bind em `0.0.0.0`.

### Passo 3: Inicialização Automática Segura (Migrations + Seed Idempotente)
Ao iniciar no Railway (`npm run start:prod`), o container executa automaticamente:
1. `npx prisma migrate deploy` — aplica as migrations SQL no PostgreSQL de forma segura e não destrutiva.
2. `npx tsx prisma/seed.ts` — cria de forma **idempotente** (sem jamais apagar nem sobrescrever registros existentes) a configuração da `Escola SENAI "Morvan Figueiredo"`, as 10 turmas iniciais, as 5 medalhas oficiais, toda a programação dos 4 dias (16 a 19/11/2026), os 5 quizzes com banco técnico de questões, o QR Code inicial e o primeiro Superadministrador.
3. `node dist/server/index.js` — sobe a API REST, WebSockets, Agendador Automático e SPA compilada, respondendo `200 OK` em `/api/health`.

### Passo 4: Primeiro Acesso Administrativo
1. Acesse `https://<seu-dominio>/login`.
2. Entre com o e-mail definido em `INITIAL_ADMIN_EMAIL` e a senha de `INITIAL_ADMIN_PASSWORD`.
3. Em `/admin`, você poderá alterar senhas, cadastrar novos administradores/avaliadores em **Relatórios, Marca & LGPD**, ajustar datas e baixar o **Cartaz A4 em PDF do QR Code** para impressão nos murais da escola.

---

## 5. Execução em Ambiente de Desenvolvimento Local

### Pré-requisitos
- Node.js 20+ e npm
- Instância PostgreSQL 15+ (local ou via `docker compose up -d postgres minio`)

### Passos
```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente e configurar DATABASE_URL
cp .env.example .env

# 3. Executar migrations e popular programação inicial
npx prisma migrate deploy
npm run prisma:seed

# 4. Iniciar servidor (Express + WebSockets + Scheduler) e frontend (Vite)
npm run dev
```

### Testes End-to-End Reais
Para compilar a versão de produção e validar todo o fluxo real (Healthcheck, PostgreSQL, QR Code PNG/PDF, Cadastro Mobile, Anti-duplicidade, Upload de Foto e Vídeo, Privacidade LGPD, Aprovação do Avaliador, Pontos, Medalhas, Quizzes, Agendador Automático via WebSocket, Importação de Planilha e Relatórios Excel/PDF):

```bash
npm run build
npm run test:e2e
```

---

**SEGURANÇA COMEÇA COM VOCÊ. SUA ATITUDE FAZ A DIFERENÇA!**  
*Escola SENAI "Morvan Figueiredo" • SIPAT 2026*

