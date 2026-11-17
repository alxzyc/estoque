# Especificação do Sistema de Gestão de Estoque

## Visão Geral

Sistema web multi-tenant de gestão de estoque para pequenos e médios negócios.

## Tecnologias

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Estado:** TanStack Query
- **Formulários:** React Hook Form + Zod
- **UI:** Tailwind CSS + Lucide React
- **Gráficos:** Recharts

## Estrutura de Pastas

```
src/
├── App.tsx                    # Rotas principais
├── main.tsx                   # Entry point
├── index.css                  # Tailwind base + tema escuro
├── components/
│   ├── ui/                   # Componentes reutilizáveis
│   ├── layout/                 # Header, Sidebar, MainLayout
│   └── forms/                  # Componentes de formulários
├── features/
│   ├── dashboard/              # Dashboard principal
│   ├── products/               # Módulo de produtos
│   ├── categories/             # Módulo de categorias
│   ├── suppliers/              # Módulo de fornecedores
│   ├── locations/              # Módulo de depósitos
│   ├── movements/              # Módulo de movimentações
│   ├── reports/                # Módulo de relatórios
│   ├── users/                  # Módulo de usuários
│   ├── settings/               # Configurações da organização
│   └── auth/                   # Autenticação
├── domain/                     # Regras de negócio puras
├── data/
│   ├── repositories/           # Repositórios Supabase
│   ├── queries/                 # Queries
│   └── mutations/             # Mutations
├── lib/
│   ├── supabase/               # Client Supabase
│   ├── query/                  # Query client & hooks
│   └── validations/            # Schemas Zod
└── utils/                      # Utilitários
```

## Variáveis de Ambiente

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build
npm run preview  # Preview do build
npm run test     # Testes unitários
npm run typecheck # Verificar tipos
```

## Migrações do Banco

As migrações estão em `supabase/migrations/`:

1. `001_initial_schema.sql` - Schema inicial
2. `002_rls_policies.sql` - Políticas de segurança
3. `003_functions.sql` - Funções transacionais
4. `004_onboarding.sql` - Função de onboarding
5. `005_notifications.sql` - Sistema de notificações

## Próximos Passos

1. Instalar dependências: `npm install`
2. Configurar Supabase e atualizar `.env.local`
3. Executar migrações no Supabase
4. Desenvolver modos restantes de forma iterativa