# GreenCode AV2

## Identificação do Projeto Acadêmico
- **Aluno:** João Gabriel Barros Guimarães
- **Curso:** Desenvolvimento de Software Multiplataforma
- **Disciplina:** Técnicas de Programação I
- **Professor:** Prof. Gerson Penha

---

## 1. Guia Rápido



### Comandos de Inicialização e Execução

```bash
# 1. Subir o banco de dados PostgreSQL via Docker
docker compose up -d

# 2. Instalar dependências do projeto
npm install

# 3. Aplicar o schema do banco e rodar o seed inicial
npm run setup

# 4. Executar os testes
npm test

# 5. Compilar o projeto
npm run build

# 6. Iniciar o servidor web
npm start
```

> **Ambiente de Desenvolvimento com Hot-Reload:** `npm run dev`  
> **Documentação Interativa (Swagger/OpenAPI):** `http://localhost:3000/docs`  
> **Health Check:** `http://localhost:3000/health`

### Credenciais de Teste Geradas pelo Seed

| Papel (`PapelUsuario`) | Usuário | Senha | Escopo de Permissões |
| :--- | :--- | :--- | :--- |
| `ADMINISTRADOR` | `admin` | `admin123` | Acesso irrestrito a todos os endpoints e gestão de usuários |
| `OPERADOR_CADASTRO` | `operador` | `operador123` | Cadastro e atualização de organizações e contratos |
| `GESTOR_ALMOXARIFADO` | `gestor` | `gestor123` | Gestão de lotes, triagem técnica e movimentação de equipamentos |
| `AUDITOR` | `auditor` | `auditor123` | Acesso estritamente de leitura (`GET`) a relatórios, rastreabilidade e journals |

---

## 2. Matriz de Endpoints da API

### Autenticação (`/auth`)
- `POST /auth/login` - Autenticação pública e emissão de JWT.
- `POST /auth/usuarios` - Cadastro de novos operadores/usuários (`ADMINISTRADOR`).
- `GET /auth/usuarios` - Listagem de usuários do sistema (`ADMINISTRADOR`).
- `GET /auth/me` - Perfil do usuário logado (Autenticado).

### Organizações e Contratos (`/organizacoes`)
- `POST /organizacoes` - Cadastro de organização parceira e contrato (`OPERADOR_CADASTRO`, `ADMINISTRADOR`).
- `PUT /organizacoes/:id` - Atualização cadastral com versionamento otimista (`OPERADOR_CADASTRO`, `ADMINISTRADOR`).
- `POST /organizacoes/:id/contrato` - Vinculação ou renovação de contrato (`OPERADOR_CADASTRO`, `ADMINISTRADOR`).
- `GET /organizacoes` - Listagem com filtros (`OPERADOR_CADASTRO`, `ADMINISTRADOR`, `AUDITOR`).
- `GET /organizacoes/:id` - Detalhes da organização (`OPERADOR_CADASTRO`, `ADMINISTRADOR`, `AUDITOR`).

### Lotes de Descarte (`/lotes`)
- `POST /lotes` - Cadastro de lote com validação de janela de 90 dias (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `POST /lotes/:id/triagem` - Processamento técnico de triagem do lote e equipamentos (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `PATCH /lotes/:id/status` - Atualização de status com versionamento otimista (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `GET /lotes` - Listagem de lotes (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).
- `GET /lotes/:id` - Detalhes do lote (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).

### Equipamentos e Movimentações (`/equipamentos`)
- `POST /equipamentos` - Cadastro individual vinculado a lote (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `PATCH /equipamentos/:id/estado-fisico` - Atualização de estado físico com trava de degradação severa (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `PATCH /equipamentos/:id/status` - Transição de status na máquina de estados com geração de movimentação (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`).
- `GET /equipamentos` - Listagem com filtros por tipo, status e lote (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).
- `GET /equipamentos/:id` - Detalhes do equipamento (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).
- `GET /equipamentos/codigo/:codigoBarras` - Busca rápida por código de barras (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).
- `GET /equipamentos/:id/depreciacao` - Cálculo da depreciação estimada conforme estado físico (`GESTOR_ALMOXARIFADO`, `ADMINISTRADOR`, `AUDITOR`).

### Relatórios e Auditoria (`/relatorios`)
- `GET /relatorios/geral` - Métricas consolidadas de lotes, pesos e valores (`ADMINISTRADOR`, `AUDITOR`, `GESTOR_ALMOXARIFADO`).
- `GET /relatorios/rastreabilidade/:codigoBarras` - Trilha completa de rastreabilidade do equipamento (`ADMINISTRADOR`, `AUDITOR`, `GESTOR_ALMOXARIFADO`).
- `GET /relatorios/audit-trail` - Journal completo de transações e mutações do sistema (`ADMINISTRADOR`, `AUDITOR`).

---
