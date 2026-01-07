# Instalação Rápida - DAQPG 0.8

## 📋 Pré-requisitos

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **pnpm** (será instalado no passo 2)

## 🚀 Instalação em 5 Passos

### 1️⃣ Instalar pnpm

Escolha o método para seu sistema:

**Usando npm:**
```bash
npm install -g pnpm
```

**Linux/macOS:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Windows (PowerShell):**
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### 2️⃣ Criar Ambiente Virtual Python

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows (CMD):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

> **Nota Windows**: Se houver erro de política de execução no PowerShell:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 3️⃣ Instalar Dependências Python

```bash
pip install -r requirements.txt
```

### 4️⃣ Instalar Dependências Node.js

```bash
pnpm install
```

### 5️⃣ Executar a Aplicação

```bash
pnpm dev:full
```

## ✅ Pronto!

Acesse no navegador:
- **Local**: http://localhost:5001
- **Rede**: http://seu-ip:5001

**Credenciais padrão:**
- Admin: `admin` / `admin`
- User: `user` / `user`

## 📚 Documentação Completa

- **GuideME.md** - Guia de uso detalhado
- **README.md** - Informações técnicas e changelog

## 🆘 Problemas Comuns

### Porta 5001 em uso
Edite `backend/config.ini` e altere a PORT.

### Erro ao ativar venv no Windows
Execute no PowerShell como administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Frontend não carrega
Execute novamente:
```bash
pnpm build
```

## 🧪 Testar com Dados Simulados

Em outro terminal (com venv ativado):

**Linux/macOS:**
```bash
source venv/bin/activate
python simulate_collector.py --collector-id COL001 --interval 2
```

**Windows:**
```cmd
venv\Scripts\activate.bat
python simulate_collector.py --collector-id COL001 --interval 2
```

---

**DAQPG 0.8** - Sistema Profissional de Aquisição de Dados
