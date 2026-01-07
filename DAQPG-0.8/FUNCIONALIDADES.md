# DAQPG - Documentação Completa de Funcionalidades

**Data Acquisition Platform for General Purpose**  
Versão 0.8 | Sistema de Aquisição de Dados e Monitoramento em Tempo Real

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Funcionalidades Principais](#funcionalidades-principais)
4. [Backend - API e Serviços](#backend---api-e-serviços)
5. [Frontend - Interface do Usuário](#frontend---interface-do-usuário)
6. [Banco de Dados](#banco-de-dados)
7. [Sistema de Coleta](#sistema-de-coleta)
8. [Exportação de Dados](#exportação-de-dados)
9. [Segurança e Autenticação](#segurança-e-autenticação)
10. [Configurações](#configurações)

---

## 🎯 Visão Geral

O DAQPG é uma plataforma completa de aquisição de dados em tempo real desenvolvida para laboratórios e ambientes industriais. O sistema permite coletar, monitorar, armazenar e analisar dados de múltiplos sensores simultaneamente através de uma interface web moderna e responsiva.

### Principais Características

- ✅ **Aquisição em Tempo Real** - Coleta contínua de dados de múltiplos canais
- ✅ **Múltiplos Experimentos** - Gerenciamento simultâneo de várias medições
- ✅ **Interface Web Moderna** - Dashboard responsivo com gráficos interativos
- ✅ **Comunicação Bidirecional** - WebSockets para atualizações em tempo real
- ✅ **Exportação Flexível** - PDF e XLSX com formatação profissional
- ✅ **Banco de Dados Normalizado** - Schema relacional otimizado
- ✅ **Sistema de Usuários** - Autenticação com diferentes níveis de permissão
- ✅ **Alta Performance** - Capaz de processar milhares de leituras por segundo

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

#### Backend
- **Flask 3.1.2** - Framework web Python
- **Flask-SocketIO 5.5.1** - Comunicação WebSocket em tempo real
- **Flask-CORS 6.0.1** - Suporte a Cross-Origin Resource Sharing
- **Flask-Login 0.6.3** - Gerenciamento de autenticação
- **SQLite 3** - Banco de dados relacional
- **Pandas 2.3.3** - Processamento de dados
- **XlsxWriter 3.2.9** - Geração de planilhas Excel

#### Frontend
- **Next.js 14.2.16** - Framework React com SSG
- **React 18** - Biblioteca de interface
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utilitário
- **Radix UI** - Componentes acessíveis
- **Chart.js 4.5** - Gráficos interativos
- **Socket.IO Client** - Cliente WebSocket
- **Framer Motion 12** - Animações suaves

#### Comunicação
- **HTTP REST API** - Endpoints para operações CRUD
- **WebSocket (Socket.IO)** - Comunicação bidirecional em tempo real
- **Server-Sent Events** - Atualizações do servidor

### Estrutura de Diretórios

```
DAQPG-0.8/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Inicialização Flask + SocketIO
│   │   ├── routes.py             # Rotas HTTP/REST
│   │   ├── sockets.py            # Handlers WebSocket
│   │   ├── models.py             # Modelos de dados in-memory
│   │   └── database.py           # Camada de acesso ao banco
│   ├── migrations/               # Scripts de migração de DB
│   ├── config.ini                # Configurações do servidor
│   └── run.py                    # Entry point do backend
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # Layout principal
│   │   ├── page.tsx              # Página de login
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── configuracao/         # Configuração de experimentos
│   │   ├── monitoramento/        # Monitoramento em tempo real
│   │   ├── relatorios/           # Relatórios e análises
│   │   └── table/                # Visualização tabular
│   ├── components/               # Componentes React reutilizáveis
│   ├── lib/                      # Utilitários e API client
│   └── styles/                   # Estilos globais
├── simulate_collector.py         # Simulador de coletor de dados
├── package.json                  # Dependências Node.js
├── requirements.txt              # Dependências Python
└── datalogger.db                 # Banco de dados SQLite
```

---

## ⚙️ Funcionalidades Principais

### 1. Gerenciamento de Experimentos

#### 1.1 Criação de Experimentos
- **Nomenclatura customizável** - Nome descritivo para cada experimento
- **Seleção de coletor** - Escolha entre coletores disponíveis na rede
- **Configuração de canais** - Até 22 canais configuráveis
- **Tipos de sensores suportados:**
  - Temperatura (°C)
  - Tensão (V)
  - Resistência (Ω)
  - Personalizado (unidade customizável)
- **Intervalo de salvamento** - Configurável de 1 a 3600 segundos
- **Duração do experimento** - Tempo total ou contínuo
- **Limites de valores** - Mín/máx para cada canal
- **Habilitação seletiva** - Ativar/desativar canais individualmente

#### 1.2 Execução de Experimentos
- **Início imediato** - Coleta inicia assim que configurado
- **Timestamp UTC** - Registro preciso de tempo de início
- **Status em tempo real** - Indicadores visuais de estado
- **Tempo decorrido** - Contador live desde o início
- **Auto-stop** - Encerramento automático ao atingir duração
- **Pausa/retomar** - Pausar temporariamente a visualização
- **Parada manual** - Encerrar experimento a qualquer momento

#### 1.3 Monitoramento de Experimentos
- **Múltiplas visualizações simultâneas** - Monitorar vários experimentos
- **Dashboard consolidado** - Visão geral de todos experimentos
- **Status indicators** - Em execução, pausado, finalizado
- **Métricas de performance** - Pontos coletados, taxa de amostragem

### 2. Visualização de Dados em Tempo Real

#### 2.1 Gráficos Interativos
- **Chart.js integration** - Gráficos de linha responsivos
- **Cores distintas** - Paleta de 8 cores para identificação
- **Zoom e pan** - Navegação interativa no gráfico
- **Tooltips informativos** - Valores exatos ao passar o mouse
- **Legendas personalizáveis** - Nomes dos canais em destaque
- **Atualização automática** - Novos dados aparecem instantaneamente

#### 2.2 Janelas de Tempo
- **30 segundos** - Visualização de curto prazo
- **1 minuto** - Análise de tendências rápidas
- **5 minutos** - Observação de médio prazo
- **10 minutos** - Análise de longo prazo
- **Todo histórico** - Visualização completa desde o início
- **Scroll horizontal** - Navegação pelo histórico completo
- **Auto-scroll** - Acompanha automaticamente novos dados
- **Fixed window** - Congela a janela ao fazer scroll manual

#### 2.3 Valores ao Vivo
- **Display numérico** - Valores atuais de cada canal
- **Formatação automática** - 3 casas decimais
- **Unidades de medida** - Exibição correta (°C, V, Ω)
- **Indicadores de status** - Verde (ativo), cinza (inativo)
- **Atualização em tempo real** - Refresh a cada novo dado
- **Lista scrollável** - Suporta muitos canais

#### 2.4 Tabela de Dados
- **Visualização tabular** - Todos os pontos em formato de tabela
- **Timestamp** - Tempo relativo (segundos desde início)
- **Todos os canais** - Coluna para cada sensor ativo
- **Ordenação** - Ordem cronológica
- **Scroll infinito** - Navegação por milhares de linhas
- **Janela externa** - Abre em popup para análise paralela

### 3. Sistema de Coleta de Dados

#### 3.1 Detecção de Coletores
- **Auto-discovery** - Detecta coletores na rede automaticamente
- **Status em tempo real** - Online, offline, em uso
- **Último heartbeat** - Timestamp da última comunicação
- **Timeout configurável** - 15 segundos padrão
- **Identificação única** - ID do coletor (ex: Coletor_A_Lab_01)
- **Dados de amostra** - Valores mais recentes de cada canal

#### 3.2 Protocolo de Comunicação
- **Endpoint HTTP POST** - `/api/data`
- **Formato JSON** - Estrutura padronizada
```json
{
  "collector_id": "Coletor_A_Lab_01",
  "readings": [0.0, 554.8676, 555.1401, ...]
}
```
- **Array indexado** - readings[0] = canal 0, etc.
- **Valores null** - Sensor desconectado ou erro
- **Frequência livre** - Coletor define taxa de envio
- **Validação** - Backend valida integridade dos dados

#### 3.3 Processamento de Dados
- **Filtragem por experimento** - Apenas canais configurados são salvos
- **Intervalo de salvamento** - Respeita intervalo configurado
- **Timestamp relativo** - Calcula offset desde início
- **Validação de valores** - Rejeita valores inválidos (null, NaN)
- **Batch insert** - Salva múltiplos canais em uma transação
- **Error handling** - Logs detalhados em caso de falha

### 4. Banco de Dados

#### 4.1 Schema Normalizado (v0.8)

**Tabela: experiments**
```sql
CREATE TABLE experiments (
    id_exp INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    collector_id TEXT NOT NULL,
    start REAL NOT NULL,           -- Unix timestamp
    finish REAL,                   -- Unix timestamp
    duration REAL,                 -- Segundos planejados
    interval REAL,                 -- Intervalo de salvamento
    created_at REAL DEFAULT (strftime('%s', 'now'))
);
```

**Tabela: config_read** (Configuração de Canais)
```sql
CREATE TABLE config_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_exp INTEGER NOT NULL,
    canal TEXT NOT NULL,           -- "0", "1", "2", etc.
    id_canal INTEGER NOT NULL,     -- 0, 1, 2, etc.
    nome_canal TEXT,               -- "Canal 201", etc.
    limites TEXT,                  -- JSON: {"min": 0, "max": 100}
    unidade TEXT,                  -- "°C", "V", "Ω"
    tipo TEXT,                     -- "temp", "volt", "res"
    habilitado INTEGER DEFAULT 1,  -- 0 ou 1
    FOREIGN KEY (id_exp) REFERENCES experiments (id_exp) ON DELETE CASCADE,
    UNIQUE(id_exp, canal)
);
```

**Tabela: readings** (Leituras de Sensores)
```sql
CREATE TABLE readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_canal INTEGER NOT NULL,
    time REAL NOT NULL,            -- Unix timestamp absoluto
    value REAL NOT NULL,
    FOREIGN KEY (id_canal) REFERENCES config_read (id) ON DELETE CASCADE
);
```

#### 4.2 Índices para Performance
```sql
CREATE INDEX idx_config_read_id_exp ON config_read (id_exp);
CREATE INDEX idx_config_read_id_canal ON config_read (id_canal);
CREATE INDEX idx_readings_id_canal ON readings (id_canal);
CREATE INDEX idx_readings_time ON readings (time);
CREATE INDEX idx_readings_canal_time ON readings (id_canal, time);
```

#### 4.3 Integridade Referencial
- **CASCADE DELETE** - Deletar experimento remove configs e readings
- **FOREIGN KEYS habilitados** - PRAGMA foreign_keys = ON
- **UNIQUE constraints** - Previne configs duplicadas
- **NOT NULL constraints** - Campos obrigatórios validados

#### 4.4 Migração de Schema
- **Script automático** - `backend/migrations/001_restructure_database.py`
- **Backup automático** - Cria backup timestampado antes de migrar
- **Preservação de dados** - Migra todos os experimentos e readings
- **Verificação de integridade** - Valida dados após migração
- **Rollback** - Backup disponível para restauração

### 5. Exportação de Dados

#### 5.1 Exportação para XLSX (Excel)
- **Formatação profissional** - Template customizado
- **Cabeçalho institucional** - "Laboratório de Desenvolvimento"
- **Metadados** - Nome experimento, data/hora, equipamento
- **Tabela formatada** - Bordas, cores alternadas
- **Código de cores**:
  - Azul escuro (#0B2239) - Cabeçalho
  - Cinza claro (#F2F2F2) - Linhas alternadas
  - Amarelo (#FFD700) - Destaques (se configurado)
- **Colunas de dados**:
  - Tempo (s) - Timestamp relativo
  - Canal 1, Canal 2, ... - Valores com nomes customizados
- **Formato numérico** - 2 casas decimais
- **Auto-fit columns** - Largura otimizada
- **Download direto** - Base64 encoding para browser

#### 5.2 Exportação para PDF
- **jsPDF + AutoTable** - Geração client-side
- **Cabeçalho completo**:
  - Nome do experimento
  - Coletor utilizado
  - Período (início - fim)
  - Data/hora de geração
- **Tabela paginada** - Quebra automática de páginas
- **Estilos customizados**:
  - Header em verde (#15803D)
  - Alternação de cores nas linhas
  - Fonte Helvetica
- **Estatísticas** - Total de pontos, canais ativos
- **Rodapé** - Número de páginas
- **Download automático** - Nome arquivo com timestamp

### 6. Interface do Usuário

#### 6.1 Página de Login
- **Formulário responsivo** - Mobile-first design
- **Validação client-side** - Feedback imediato
- **Credenciais de exemplo**:
  - Admin: admin / admin
  - User: user / user
- **Persistência de sessão** - Cookie HttpOnly
- **Feedback visual** - Loading states, erro/sucesso
- **Redirecionamento** - Para dashboard após login

#### 6.2 Dashboard Principal
- **Cards de estatísticas**:
  - Total de experimentos
  - Experimentos em execução
  - Coletores online
  - Últimas medições
- **Lista de experimentos ativos** - Cards com status
- **Últimas medições** - 4 mais recentes com preview
- **Botão "Ver Todas"** - Navegação para relatórios
- **Indicadores visuais**:
  - Verde - Em execução
  - Cinza - Finalizado
  - Pulsante - Aguardando dados
- **Timestamps humanizados** - Tempo decorrido ou data/hora
- **Ações rápidas** - Parar, visualizar, exportar

#### 6.3 Configuração de Experimentos
- **Wizard intuitivo** - Processo passo a passo
- **Seleção de coletor** - Dropdown com status
- **Campo nome** - Validação de caracteres especiais
- **Configuração de canais** - Grid 22 canais
- **Para cada canal**:
  - Checkbox habilitar/desabilitar
  - Nome customizável
  - Tipo de sensor (dropdown)
  - Unidade de medida
  - Limites min/max (opcional)
- **Intervalo de salvamento** - Slider 1-3600s
- **Duração** - Input numérico ou "contínuo"
- **Preview da configuração** - Resumo antes de iniciar
- **Validações**:
  - Pelo menos 1 canal ativo
  - Nome não vazio
  - Coletor disponível
  - Intervalos válidos

#### 6.4 Monitoramento em Tempo Real
- **Layout responsivo** - Grid adaptativo
- **Seção de gráfico** - 75% da largura
- **Seção de valores** - 25% da largura
- **Controles superiores**:
  - Botão voltar
  - Nome do experimento
  - Tempo decorrido (HH:MM:SS)
  - Status badge
  - Botões: Pausar, Parar, Fullscreen, Exportar
- **Controles de escala** - Botões de janela de tempo
- **Gráfico Chart.js** - Responsivo, 500px altura
- **Painel lateral** - Valores ao vivo scrollável
- **Alertas contextuais** - Pausado, erro, sem dados
- **Animações suaves** - Framer Motion
- **Auto-refresh** - 1 segundo

#### 6.5 Relatórios e Análises
- **Dois modos de visualização**:
  - **Grid** - Cards com preview de gráfico
  - **Sidebar** - Lista + detalhes
- **Sidebar (modo padrão)**:
  - Lista de experimentos (esquerda, 30%)
  - Detalhes + gráfico (direita, 70%)
  - Auto-scroll para selecionado
  - Smooth transitions
- **Filtros e busca** - Por nome, data, coletor
- **Ordenação** - Data, nome, duração
- **Estatísticas agregadas**:
  - Média de cada canal
  - Mín/máx de cada canal
  - Desvio padrão
  - Total de pontos
- **Gráfico histórico** - Toda a série temporal
- **Ações disponíveis**:
  - Exportar XLSX
  - Exportar PDF
  - Deletar (admin apenas)
  - Abrir tabela em janela
- **Animações**:
  - Slide-in sidebar (esquerda)
  - Fade content (direita)
  - Layout transition smooth

#### 6.6 Visualização Tabular
- **Tabela completa** - Todos os pontos de dados
- **Colunas dinâmicas** - Baseadas em canais ativos
- **Formatação de valores** - 3 casas decimais
- **Header fixo** - Permanece visível ao scroll
- **Zebra striping** - Linhas alternadas
- **Responsiva** - Scroll horizontal se necessário
- **Janela popup** - Abre em nova janela (1200x800)
- **Exportação inline** - Botões na própria tabela

### 7. Sistema de Comunicação em Tempo Real

#### 7.1 WebSocket Events (Socket.IO)

**Cliente → Servidor:**
- `connect` - Conexão estabelecida
- `subscribe_to_experiment` - Inscrever em experimento
- `unsubscribe_from_experiment` - Cancelar inscrição
- `start_experiment` - Iniciar novo experimento
- `stop_experiment` - Parar experimento em execução
- `delete_experiment` - Deletar experimento (admin)
- `generate_xlsx` - Solicitar exportação Excel
- `get_collector_data` - Obter dados de coletor específico

**Servidor → Cliente:**
- `initial_config` - Configuração inicial de canais
- `collectors_update` - Atualização de coletores online
- `experiments_update` - Lista de experimentos (running + completed)
- `experiment_history` - Histórico completo de experimento
- `new_data` - Novo ponto de dados (broadcast para sala)
- `xlsx_generated` - XLSX pronto para download
- `error` - Mensagem de erro

#### 7.2 REST API Endpoints

**Autenticação:**
- `POST /api/login` - Login de usuário
- `GET /api/logout` - Logout de usuário
- `GET /api/status` - Status de autenticação

**Dados:**
- `POST /api/data` - Receber dados de coletor

**Frontend (SPA):**
- `GET /` - Página principal (index.html)
- `GET /<path>` - Rotas do Next.js (SPA routing)

### 8. Segurança e Autenticação

#### 8.1 Sistema de Usuários
- **Flask-Login** - Gerenciamento de sessões
- **Dois níveis de permissão**:
  - **Admin** - Todas as operações + deletar experimentos
  - **User** - Criar, visualizar, parar experimentos
- **Sessões persistentes** - Cookie HttpOnly
- **Timeout de sessão** - Configurável
- **CORS configurado** - Permite frontend separado

#### 8.2 Usuários Padrão
```python
users = {
    "1": User(id="1", username="admin", role="admin"),
    "2": User(id="2", username="user", role="user"),
}
user_credentials = {
    "admin": {"password": "admin", "id": "1"},
    "user": {"password": "user", "id": "2"},
}
```

#### 8.3 Proteções
- **@login_required** - Decorator para rotas protegidas
- **Role-based access** - Verificação de permissões
- **CSRF protection** - Token em formulários
- **SQL injection** - Prepared statements
- **XSS protection** - Sanitização de inputs

### 9. Configurações

#### 9.1 Backend (config.ini)
```ini
[SERVER]
HOST = 0.0.0.0              # Bind em todas interfaces
PORT = 5001                 # Porta do servidor
DISPLAY_HOST = auto         # IP para exibição (auto-detect)
STATIC_DIR = ../frontend/out  # Diretório do build frontend
SECRET_KEY = sua-chave-secreta  # Chave para sessões

[DATABASE]
FILE = ../datalogger.db     # Caminho do banco SQLite

[APPLICATION]
NUM_CHANNELS = 22           # Número total de canais
COLLECTOR_TIMEOUT_SECONDS = 15  # Timeout para coletores
```

#### 9.2 Frontend (Next.js)
- **API_BASE** - URL do backend (auto-detect ou env var)
- **SOCKET_URL** - URL para WebSocket (auto-detect ou env var)
- **Environment variables**:
  - `NEXT_PUBLIC_API_BASE` - Override de API base
  - `NEXT_PUBLIC_SOCKET_URL` - Override de socket URL

### 10. Simulador de Coletor

O arquivo `simulate_collector.py` fornece um coletor de dados simulado para testes:

#### 10.1 Funcionalidades
- **22 canais** - Simula todos os canais configuráveis
- **Dados aleatórios** - Valores variáveis por tipo:
  - Temperatura: 20-100°C
  - Tensão: 0-12V
  - Resistência: 0-1000Ω
- **Frequência configurável** - Intervalo entre envios
- **Auto-registro** - Envia dados para `/api/data`
- **ID único** - Identificação do coletor
- **Valores realistas** - Simula ruído e variações

#### 10.2 Uso
```bash
python simulate_collector.py
```

Parâmetros editáveis no código:
- `COLLECTOR_ID` - Nome do coletor
- `API_URL` - URL do backend
- `INTERVAL` - Segundos entre envios
- `channel_types` - Tipos de cada canal

---

## 📊 Capacidades e Limites

### Performance
- **Canais simultâneos:** Até 22 por experimento
- **Experimentos simultâneos:** Ilimitado (limitado por recursos)
- **Taxa de amostragem:** Até 1 Hz por experimento (configurável)
- **Armazenamento:** Limitado por disco (SQLite escala bem até GB)
- **Throughput:** ~1000 pontos/segundo (teste local)
- **Latência WebSocket:** <100ms em rede local

### Escalabilidade
- **Clientes simultâneos:** 50+ navegadores conectados
- **Histórico:** Milhões de pontos por experimento
- **Retenção de dados:** Ilimitada (gerenciamento manual)
- **Backup:** Migração automática com backup

---

## 🔄 Fluxo de Dados

### 1. Coleta de Dados
```
Coletor → POST /api/data → Backend → Valida experimento ativo
                                   → Filtra canais configurados
                                   → Verifica intervalo de salvamento
                                   → Salva no banco (batch insert)
                                   → Emite via WebSocket → Clientes
```

### 2. Visualização em Tempo Real
```
Cliente → Socket.IO connect → Servidor
        → subscribe_to_experiment(id)
        → Servidor consulta histórico → Envia para cliente
        → Novos dados → Broadcast para sala → Cliente atualiza gráfico
```

### 3. Exportação
```
Cliente → Clica "Exportar XLSX"
        → Socket.IO emit('generate_xlsx', exp_id)
        → Servidor consulta readings + config
        → Pandas DataFrame
        → XlsxWriter formata
        → Base64 encode
        → Socket.IO emit('xlsx_generated', data)
        → Cliente download automático
```

---

## 🎨 Design e UX

### Princípios de Design
- **Mobile-first** - Responsivo desde smartphones
- **Accessibility** - Radix UI com ARIA labels
- **Performance** - Lazy loading, code splitting
- **Feedback visual** - Loading states, animações
- **Consistência** - Design system com Tailwind

### Tema
- **Cores primárias:**
  - Verde: #15803D (Primary)
  - Lime: #84CC16 (Accent)
  - Cinza: #374151 (Text)
- **Dark mode:** Suportado via next-themes
- **Tipografia:** Geist (Sans-serif moderna)
- **Ícones:** Lucide React (consistente, leve)

### Animações
- **Framer Motion** - Transições suaves
- **Layout animations** - 0.3s ease-out
- **Slide transitions** - Sidebar, cards
- **Fade effects** - Conteúdo, tooltips
- **Micro-interactions** - Hover, click feedback

---

## 📈 Métricas e Monitoramento

### Logs do Backend
- **Startup info** - IP, porta, configurações
- **Conexões WebSocket** - Cliente conectado/desconectado
- **Experimentos** - Criação, início, parada
- **Coletores** - Detectados, removidos por timeout
- **Erros** - Stack trace completo para debug

### Informações Exibidas
- **Dashboard:**
  - Total de experimentos (running + completed)
  - Experimentos ativos
  - Coletores online
  - Últimas medições
- **Monitoramento:**
  - Tempo decorrido (HH:MM:SS)
  - Status (running, paused, stopped)
  - Taxa de amostragem
  - Último valor de cada canal
- **Relatórios:**
  - Duração total
  - Número de pontos coletados
  - Estatísticas agregadas

---

## 🔧 Manutenção e Administração

### Backup de Dados
- **Manual:** Copiar `datalogger.db`
- **Automático:** Script de migração cria backups timestampados
- **Formato:** SQLite (portável, compacto)

### Limpeza de Dados
- **Deletar experimentos:** Interface admin
- **CASCADE delete:** Remove readings automaticamente
- **VACUUM:** Compactar banco após deleções
```bash
sqlite3 datalogger.db "VACUUM;"
```

### Monitoramento de Recursos
- **Disco:** Verificar tamanho de `datalogger.db`
- **Memória:** Backend ~50-100MB em idle
- **CPU:** <5% em coleta normal, picos em exportação

---

## 🚀 Roadmap e Melhorias Futuras

### Planejado
- [ ] Alertas configuráveis (email, SMS)
- [ ] Análise estatística avançada (FFT, correlação)
- [ ] Exportação para formatos científicos (HDF5, NetCDF)
- [ ] Múltiplos usuários (cadastro, permissões granulares)
- [ ] API RESTful completa (CRUD de experimentos)
- [ ] Suporte a PostgreSQL/MySQL
- [ ] Dashboard customizável (drag-and-drop widgets)
- [ ] Anotações em experimentos
- [ ] Comparação de experimentos (overlay)
- [ ] Machine learning para previsões

### Considerado
- [ ] Mobile app (React Native)
- [ ] Edge computing (processamento no coletor)
- [ ] Cloud storage (AWS S3, Google Cloud)
- [ ] Integração com LabVIEW
- [ ] Suporte a MQTT protocol
- [ ] Containerização (Docker)

---

## 📝 Notas Técnicas

### Decisões de Arquitetura

**Por que SQLite?**
- Simplicidade (zero-config)
- Performance adequada para escala esperada
- Portabilidade (arquivo único)
- ACID compliance
- Migração fácil para PostgreSQL se necessário

**Por que Next.js SSG?**
- Performance (páginas estáticas)
- SEO (se necessário)
- Hot reload em desenvolvimento
- Build otimizado automático
- TypeScript out-of-the-box

**Por que Flask-SocketIO?**
- Integração nativa com Flask
- Fallback para polling se WebSocket falhar
- Rooms para broadcast eficiente
- Eventlet/Gevent para concorrência

### Limitações Conhecidas

1. **SQLite write concurrency** - Um writer por vez (aceitável para escala atual)
2. **In-memory state** - Experimentos em memória perdidos se servidor reiniciar (mitigado por reload do DB)
3. **No clustering** - Single-server (aceitável para uso local/lab)
4. **Autenticação básica** - Não adequada para produção internet-facing
5. **Frontend estático** - Necessita rebuild para mudanças (aceitável para deploy)

---

## 📄 Licença e Créditos

### Tecnologias de Código Aberto Utilizadas

- Flask (BSD-3-Clause)
- React (MIT)
- Next.js (MIT)
- Chart.js (MIT)
- Tailwind CSS (MIT)
- Socket.IO (MIT)
- Pandas (BSD)
- SQLite (Public Domain)

---

**Desenvolvido para aquisição de dados em tempo real em ambientes de laboratório e pesquisa.**

_Versão 0.8 - Novembro 2025_
