# Sistema de Gestão de Estoque

Sistema web multi-tenant de gestão de estoque para pequenos e médios negócios.

## Tecnologias

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Estado:** TanStack Query
- **Formulários:** React Hook Form + Zod
- **UI:** Tailwind CSS + Lucide React
- **Gráficos:** Recharts

## Configuração

1. Copie `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```

2. Atualize os valores das variáveis de ambiente:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Instale as dependências:
```bash
npm install
```

## Scripts

```bash
npm run dev      # Desenvolvimento (http://localhost:3000)
npm run build    # Build
npm run preview  # Preview do build
npm run test     # Testes unitários
npm run typecheck # Verificar tipos TypeScript
```

## Estrutura

```
src/
├── App.tsx                    # Rotas principais
├── main.tsx                   # Entry point
├── index.css                  # Tailwind base + tema escuro
├── components/                # Componentes reutilizáveis
├── features/                  # Módulos por funcionalidade
├── domain/                    # Regras de negócio puras
├── data/                      # Repositórios e queries
├── lib/                       # Infraestrutura (Supabase, validações)
└── utils/                     # Utilitários
```

## Migrações

Migrações do banco em `supabase/migrations/`:
- `001_initial_schema.sql` - Schema inicial
- `002_rls_policies.sql` - Políticas de segurança RLS
- `003_functions.sql` - Funções transacionais
- `004_onboarding.sql` - Função de onboarding
- `005_notifications.sql` - Sistema de notificações

## Deploy

1. Configure o Supabase
2. Execute as migrações
3. Conecte o domínio no Vercel/Netlify
4. Atualize variáveis de ambiente

## Documentação

Ver [EPS.md](./EPS.md) para detalhes completos da especificação.