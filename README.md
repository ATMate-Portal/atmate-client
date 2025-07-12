# 💻 ATMate Client Frontend

O `atmate-client-frontend` é a aplicação web que serve como **interface de utilizador principal** do ecossistema ATMate. Desenvolvida em **React** e **TypeScript**, permite que contabilistas e outros profissionais consultem os dados centralizados da AT de forma simples, clara e eficiente.

---

## ✨ Funcionalidades

### 📅 Visualização de Dados de Clientes

- Lista de clientes com informações básicas.
- Detalhes completos: NIF, moradas, contactos, etc.

### 📋 Consulta de Impostos

- Lista de impostos associados a cada cliente.
- Detalhes: identificador, valor, estado, prazo de pagamento.
- Destaque de impostos urgentes ou próximos do vencimento.

### 💻 Interface Responsiva

- Experiência fluida em diferentes resoluções (Computador).

### 🛠️ Integração com API Gateway

- Consumo assíncrono via Axios de endpoints REST expostos pelo `atmate-gateway`.

---

## 🚀 Tecnologias Utilizadas

### Frontend

- `React`, `TypeScript`, `Vite`
- `Axios`, `React Router`

---

## 📆 Estrutura do Projeto

```bash
atmate-client-frontend/
├── public/                  # Ficheiros estáticos
├── src/
│   ├── api/                 # Autenticação e autorização
│   ├── components/          # Componentes reutilizáveis
│   ├── config/              # Configuração de ambiente de execução
│   ├── hooks/               # Custom hooks (useApi)
│   ├── pages/               # Páginas principais
│   ├── routes/              # Configuração de Rotas
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🛠️ Como Configurar e Executar

### ✅ Pré-requisitos

- `Node.js` (versão LTS)
- `npm` ou `yarn`
- Serviço `atmate-gateway` em execução

---

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/ATMate-Portal/atmate-client
```

---

### 2️⃣ Instalar Dependências

```bash
npm install
```

---

### 3️⃣ Configurar Ambiente

Criar ficheiro `.env` com a URL do Gateway:

```env
VITE_API_BASE_URL=http://localhost:8180/
```

---

### 4️⃣ Executar Localmente

```bash
npm run dev
# ou
yarn dev
```

- Aceder via: [http://localhost](http://localhost)

---

## 🧪 Testes (E2E com Cypress)

```bash
npm run cypress:open  # Interface interativa
```

