# CLAUDE.md — Shapefy UI

## Visão Geral
Sistema de gestão fitness para nutricionistas/personal trainers.
Stack: React 19 + React Router 7 + Zustand 5 + Axios 1.15 + Tailwind CSS 3.4 + Vite 8.
Backend: Frappe (Python). Comunicação exclusivamente via REST API nativa do Frappe — não criar funções customizadas no backend para operações que o Frappe já oferece nativamente.

---

## Arquitetura

```
Frappe (backend) ──► React (frontend)
```

Auth via token `api_key:api_secret` armazenado em `localStorage` como `frappe_token`.
O `client.js` injeta automaticamente o header `Authorization: token <frappe_token>` em toda requisição.

---

## Autenticação

- Token salvo em `localStorage.frappe_token`
- Formato: `api_key:api_secret` (NÃO é Bearer)
- Header enviado: `Authorization: token api_key:api_secret`
- `src/api/client.js` gerencia o interceptor de request e o redirect para `/login` em caso de 401
- Estado global: `src/store/authStore.js` (Zustand + persist)

---

## API Frappe — Regras de Uso

- CRUD de qualquer DocType: `GET/POST/PUT/DELETE /api/resource/{DocType}/{name}`
- Listagem com filtros/paginação: `GET /api/resource/{DocType}?fields=...&filters=...&limit=...&limit_start=...`
- Paginação: sempre usar `limit_start: (page - 1) * limit`
- Método nativo para listas com OR: `POST /api/method/frappe.desk.reportview.get` (form-urlencoded)
- Nunca criar métodos customizados no backend para operações cobertas pela API nativa

---

## Design System — Titanium Dark v2

### Tokens de cor (`tailwind.config.js`)

| Token | Valor | Uso |
|---|---|---|
| `surface-0` | `#0a0a0a` | Fundo da página |
| `surface-1` | `#1a1a1a` | Background de inputs |
| `surface-2` | `#222226` | Background de linhas de tabela |
| `surface-3` | `#29292e` | Background de cards |
| `surface-4` | `#323238` | Bordas e hover |
| `brand` | `#2563eb` | Cor de destaque principal (azul) |
| `brand-hover` | `#1d4ed8` | Hover do brand |
| `info` | `#0052cc` | Ações secundárias azuis |
| `info-hover` | `#0043a8` | Hover do info |
| `muscle-*` | vários | Grupos musculares (ver CategoricalBadge) |

**Tokens legados** (`td-bg`, `td-surface`, `td-deep`, `td-border`, `td-primary`) mantidos para compat — não usar em código novo.

### Regras de estilo obrigatórias

- **Border-radius — hierarquia de 3 tiers (nunca `rounded-md`):**
  - `rounded-xl` (12px) → cards, containers, modais, banners.
  - `rounded-lg` (8px) → inputs, botões, selects, tags, pills.
  - `rounded` (4px) → células de tabela, chips pequenos, badges inline.
- **Pesos tipográficos — só 3 pesos (nunca `font-normal` em labels/títulos):**
  - `font-medium` → labels de campo (text-xs, caixa normal).
  - `font-semibold` → títulos de seção (h3/text-sm), nomes em listas, tab ativo.
  - `font-bold` → valores destacados, h1/h2, rótulos uppercase de card, cabeçalhos de tabela.
- **Tracking (letter-spacing) em uppercase:**
  - Texto uppercase ≤12px → `tracking-wider`.
  - Breadcrumbs / rótulos uppercase de card / cabeçalhos de tabela → `tracking-widest`.
  - Títulos grandes (h1/h2) → sem tracking ou `tracking-tight`.
- **Hex hardcoded no JSX:** proibido. Usar tokens Tailwind tokenizados (`bg-[#2563eb]` é aceitável transitoriamente com comentário `// TODO: tokenizar`).
- **Responsividade:** todo componente deve funcionar em 375px sem scroll horizontal. Testar em `sm:640px`, `md:768px`, `lg:1024px`.
- **Botões touch:** `min-height: 40px` em mobile.
- **Modais mobile:** fullscreen (`h-[100dvh]`) em `<768px`; footer com botões empilhados verticalmente.
- **Tabelas mobile:** viram cards empilhados — nunca scroll horizontal em tabelas.

---

## Componentes UI (`src/components/ui/`)

**Importar sempre de `src/components/ui/index.js`. Nunca recriar botões, inputs, modais, selects, textareas ou outros primitivos do zero.**

### Catálogo completo

| Componente | Props principais | Notas |
|---|---|---|
| `Button` | `variant` (primary/secondary/ghost/info/success/danger), `size` (xs/sm/md/lg), `icon`, `iconRight`, `fullWidth`, `loading`, `onClick` | 6 variants. Sem `warning`. |
| `FormGroup` | `label`, `required`, `hint`, `error`, `success`, `counter {current,max}`, `children` | Wrapper de campo; label `text-xs font-medium` (caixa normal — não uppercase) |
| `Input` | `value`, `onChange(string)`, `placeholder`, `type`, `icon`, `error`, `disabled`, `onClear` | `h-10` padrão |
| `Select` | `value`, `onChange(string)`, `options` (array de string ou `{value,label}`), `placeholder`, `error` | Chevron svg customizado |
| `Textarea` | `value`, `onChange(string)`, `placeholder`, `rows`, `error`, `disabled` | `resize-none` padrão |
| `Autocomplete` | `value`, `onChange`, `onSelect(item)`, `searchFn(query)→Promise`, `renderItem(item)`, `placeholder`, `icon`, `compact`, `emptyState` | Debounce 200ms; keyboard nav; bottom-sheet mobile >5 items; `compact` para uso inline em tabelas |
| `Modal` | `isOpen`/`open`, `onClose`, `title`, `subtitle`, `size` (sm/md/lg/xl), `footer`, `closeOnOverlayClick` | Fullscreen mobile; footer `flex-col-reverse` mobile |
| `InformativoModal` | `isOpen`, `onClose`, `title`, `subtitle`, `size`, `icon`, `iconVariant` (info/primary/success/warning), `steps [{icon,title,description,action?}]`, `primaryAction`, `secondaryAction`, `dismissLabel`, `dontShowAgainKey` | Modal padrão para onboarding/anúncios/changelogs. Passos numerados com ícone, ação por passo, checkbox opcional "Não mostrar novamente" persistido em `localStorage`. |
| `BotaoAjuda` | `title`, `subtitle?`, `topicos [{icon?,title,description}]`, `size?`, `iconSize?`, `tooltip?` | Botão "?" pequeno (`h-7 w-7`) que abre `InformativoModal` com tópicos explicando a tela. Padrão pra tutoriais contextuais — colocar no header de telas com fluxos não-óbvios. |
| `CollapsibleBanner` | `title`, `variant` (primary/info/warning/danger), `defaultOpen`, `action` (ReactNode), `children` | |
| `StatCard` | `label`, `value`, `unit`, `color` (default/success/warning/danger/muted), `size` (sm/md/lg) | Grid 2×2 em mobile |
| `Tabs` | `tabs [{id,label,icon?,badge?,disabled?}]`, `active`, `onChange(id)`, `variant` (underline/pills) | Scroll horizontal mobile; `icon` é ReactNode |
| `FooterTotais` | `variant` (groups/inline), `leftGroup {label,items[]}`, `rightGroup {label,items[]}`, `sticky` | `items` aceitam `shortLabel` para mobile; `inline` ainda não implementado |
| `CategoricalBadge` | `category` (chave de `MUSCLE_COLORS`), `size` (sm/md), `children` | Só borda+texto coloridos, sem fundo; importar também `MUSCLE_COLORS` |
| `Badge` | `variant` (success/warning/danger/info/purple/orange/default), `size` | |
| `Card` | `className`, `children` | |
| `Spinner` | `size` | |
| `EmptyState` | `icon`, `title`, `description` | |
| `PageHeader` | `title`, `description`, `action` | |
| `Modal` | — | ver acima |
| `ListItem` | wrapper de linha clicável | |
| `Avatar` | nome/iniciais | |

### Padrão de composição de campo

```jsx
// Sempre assim — nunca colocar label inline no Input
<FormGroup label="Estratégia" required hint="Ex: Dieta Linear">
  <Input value={val} onChange={setVal} />
</FormGroup>

// Para busca com sugestões
<FormGroup label="Aluno" required>
  <Autocomplete
    searchFn={async (q) => { /* retorna array */ }}
    onSelect={(item) => { /* usa item */ }}
    renderItem={(item) => <span>{item.nome}</span>}
  />
</FormGroup>
```

### Padrão de modal

```jsx
// Sempre assim — nunca criar overlay div do zero
{showModal && (
  <Modal
    title="Título"
    onClose={() => setShowModal(false)}
    size="md"
    footer={
      <>
        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
      </>
    }
  >
    <div className="p-4 space-y-4">
      {/* conteúdo */}
    </div>
  </Modal>
)}
```

> No footer do Modal, a ordem JSX deve ser `[Cancelar, Salvar]`. Em mobile (`flex-col-reverse`) Salvar aparece visualmente em cima. Em desktop (`flex-row justify-end`) fica Cancelar | Salvar. ✓

### Anti-patterns proibidos

```jsx
// ❌ NUNCA — recriar primitivo do zero
<button className="bg-[#2563eb] px-4 py-2 rounded-lg text-white">Salvar</button>

// ✅ SEMPRE
<Button variant="primary">Salvar</Button>

// ❌ NUNCA — definir FormGroup/Input/Select local dentro de um componente de página
const FormGroup = ({ label, children }) => (...)
const Input = ({ value, onChange }) => (...)

// ✅ SEMPRE — importar de ui/
import { FormGroup, Input, Select, Textarea } from '../../components/ui'

// ❌ NUNCA — hardcodar hex em botões/inputs/modais quando já há token
<div className="fixed inset-0 bg-black/70 backdrop-blur-sm ...">  {/* modal do zero */}

// ✅ SEMPRE
<Modal title="..." onClose={...}>...</Modal>

// ❌ NUNCA — rounded-md (proibido) ou rounded-lg em card
className="rounded-md"
<div className="bg-[#29292e] rounded-lg p-4">  {/* card com rounded errado */}

// ✅ SEMPRE — raio por tier (card = xl, input/botão = lg, célula = none)
className="rounded-lg"  // input/botão/select
<div className="bg-[#29292e] rounded-xl p-4">  {/* card */}
```

### Exceções documentadas — padrões permitidos fora do DS

#### 1. Icon buttons em linhas de tabela
Botões de ação inline (editar, excluir, duplicar, visualizar) dentro de `<tr>` usam raw `<button>` porque o DS `Button` tem padding horizontal que impede o formato quadrado compacto. **Padrão obrigatório validado** (DietaListagem / FichaListagem):

```jsx
// ✅ Sempre h-7 w-7 + border + rounded-lg + sem bg default (só no hover)

// Editar (azul)
<button onClick={...} title="Editar"
  className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors">
  <Edit size={12} />
</button>

// Excluir (brand azul)
<button onClick={...} title="Excluir"
  className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors">
  <Trash2 size={12} />
</button>

// Visualizar / Duplicar / Neutro (cinza)
<button onClick={...} title="Visualizar"
  className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors">
  <Eye size={12} />
</button>

// Toggle ativo (verde) / inativo (cinza)
<button onClick={...}
  className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
    ${enabled
      ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
      : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
    }`}>
  {enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
</button>
```

**Regras:**
- `h-7 w-7` sempre — nunca `h-6 w-6` em listagens
- `rounded-lg` — nunca `rounded` sozinho
- Sem `bg` default — background só aparece no hover
- Ícone sempre `size={12}`
- Container da coluna Ações deve ter `onClick={e => e.stopPropagation()}` para não acionar `onRowClick`

#### 2. Inputs em células de tabela editável
Inputs dentro de `<td>` precisam ser compactos (`h-7`) e com borda transparente por padrão. O DS `Input` é `h-10` — usá-lo quebraria o layout da tabela. Padrão obrigatório:

```jsx
// ✅ Input numérico de célula (qtd, macros)
<input type="number" value={...} onChange={...}
  className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60" />

// ✅ Input de célula "fantasma" (medida caseira, campos opcionais)
<input value={...} onChange={...}
  className="w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors" />

// ✅ Select de célula (unidade)
<select value={...} onChange={...}
  className="w-full h-7 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
```

#### 3. Botões de ação de listagem (toolbar)
O pattern de DietaListagem é o padrão oficial para todas as telas de listagem:
- Refresh, Filtros → `<Button variant="secondary" size="sm" icon={...} />`
- Toggle grade/lista → raw `<button>` quadrado `h-7 w-7` com `bg-[#2563eb]` quando ativo
- Nova entidade → `<Button variant="primary" size="sm" icon={Plus}>Nova X</Button>`

#### 4. Botões de scroll horizontal (ações de opção/seção)
Grupos de ações contextuais que podem ser mais largos que o container no mobile:

```jsx
// ✅ Grupo de ações em scroll horizontal — sem scrollbar visível
<div className="flex flex-row gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
  <Button variant="danger"    size="xs" className="whitespace-nowrap shrink-0">Ação A</Button>
  <Button variant="success"   size="xs" className="whitespace-nowrap shrink-0">Ação B</Button>
  <Button variant="secondary" size="xs" className="whitespace-nowrap shrink-0">Ação C</Button>
</div>
```

---

## Padrão Mobile — Área do Aluno

**A área do aluno (`src/pages/Aluno/*`) tem identidade visual própria e usa um design system separado** do DS do profissional (Titanium Dark v2). O objetivo é "app premium nativo", não painel web adaptado.

### Tokens CSS (`src/index.css :root`)

Toda cor, raio, glow e borda da área do aluno **deve** vir destas vars. Não hardcodar hex novo — adicionar token aqui primeiro.

| Token | Uso |
|---|---|
| `--sf-bg` `#05070D` | Fundo de página |
| `--sf-bg-soft` `#070B14` | Fundo secundário |
| `--sf-surface` `#081426` | Superfícies (header, nav) |
| `--sf-surface-2` `#0B1C33` | Hover de superfície |
| `--sf-card` `rgba(8,22,42,.86)` | Fundo de card glass |
| `--sf-blue` `#2563EB` | Cor principal (CTA, foco, accent) |
| `--sf-blue-light` `#3B82F6` | Variação clara |
| `--sf-blue-glow` | Glow do tema |
| `--sf-cyan` `#38BDF8` | Highlight info |
| `--sf-green` / `--sf-green-light` / `--sf-green-glow` | **Apenas** sucesso (concluído, salvo, treino finalizado) |
| `--sf-red` / `--sf-red-soft` | **Apenas** logo, erro, bloqueio, alerta crítico |
| `--sf-pink-rest` `#FB7185` | Descanso (timer rest) |
| `--sf-text` / `--sf-text-muted` / `--sf-text-soft` | Hierarquia de texto |
| `--sf-border` / `--sf-border-strong` | Bordas (variantes default/forte) |
| `--sf-radius-card` `24px` | Raio de cards |
| `--sf-radius-button` `16px` | Raio de botões |

### Componentes base obrigatórios (`src/components/aluno/`)

Toda tela mobile **deve** consumir esses primitives. **Não duplicar CSS solto** — se precisar de variação, criar via `variant=`.

| Componente | Variants | Uso |
|---|---|---|
| `GlassCard` | `default` / `success` / `danger` | Wrapper de card glassmorphism com glow azul/verde/vermelho. Substitui `AlunoCard`. |
| `SectionHeader` | — | Header de seção (ícone + label uppercase com tracking) |
| `ActionButton` | `primary` / `success` / `danger` / `ghost` | Botão de ação. Min-height 52px, gradient + glow no primary |
| `StatusPill` | `success` / `danger` / `info` / `muted` | Pill de status (Ativa/Expirada/Pendente) |
| `ModuleCard` | — | Card de módulo da home (hex icon + label + badge) |
| `AlertCard` | `info` / `warning` / `danger` | Callout de pendência/aviso |
| `HexIcon` | — | Hexágono outline azul com ícone (já existente) |
| `DataChip` | `sm` / `md` / `lg` | Chip de data destacado (24 MAI) |

**Futuros (criar quando a tela usar):**
- `MobileShell` / `MobileTopBar` / `ProfileHero` — quando a próxima tela de aluno precisar
- `WorkoutExerciseCard` / `SetRow` / `TimerBar` / `VideoPreviewCard` — quando atacar a tela de treino em execução

### Estilo base obrigatório dos cards

Implementado no `GlassCard`:

```css
background:
  radial-gradient(circle at 50% 0%, rgba(37,99,235,0.16), transparent 45%),
  var(--sf-card);
border: 1px solid var(--sf-border);
border-radius: var(--sf-radius-card);
box-shadow:
  0 0 34px var(--sf-blue-glow),
  inset 0 1px 0 rgba(255,255,255,0.06);
backdrop-filter: blur(14px);
```

### Regras obrigatórias

- **Mobile-first** — largura fluida, padding lateral 16–20px. Nada de aparência de desktop comprimido.
- **Cards** sempre via `<GlassCard variant="...">`. Nunca card "chapado" sem glow/border.
- **Botões principais** via `<ActionButton variant="primary">`. Min-height **52px**.
- **Ícones** sempre dentro de container arredondado (HexIcon, círculo, rounded-xl).
- **Títulos de seção** sempre uppercase com `letter-spacing: 0.18em`, cor `text-blue-300`, peso 800.
- **Verde** só em **conclusão/sucesso** (treino finalizado, série concluída, salvo).
- **Vermelho** só em **erro/perigo** (excluir, bloqueio, alerta crítico, logo).
- **Cinza** nunca como destaque principal — azul elétrico é a identidade.
- Toda variação visual via `variant=`, nunca CSS solto duplicado em cada tela.

### Exemplo de uso correto

```jsx
import { GlassCard, ActionButton, StatusPill, SectionHeader } from '../../components/aluno'

<SectionHeader icon={<Pill size={15} />} label="Suas prescrições" />

<GlassCard variant="default" as="button" onClick={...}>
  <StatusPill variant="success">Ativa</StatusPill>
  ...
</GlassCard>

<ActionButton variant="primary" fullWidth onClick={enviar}>
  Enviar respostas
</ActionButton>
```

```jsx
// ❌ NUNCA — CSS hardcoded espalhado em cada tela
<div className="bg-[#0d0d0f] border border-blue-500/20 rounded-2xl ...">

// ✅ SEMPRE
<GlassCard>
```

---

## Templates de Página (`src/components/templates/`)

Usar os templates para montar novas telas. **Não construir layout de página do zero.**

| Template | Uso | Props principais |
|---|---|---|
| `ListPage` | Listagens (Alunos, Dietas, Fichas) | `title`, `subtitle`, `actions`, `filters`, `stats`, `loading`, `empty`, `pagination`, `children` |
| `DetailPage` | Detalhe/edição de entidade | `title`, `subtitle`, `status`, `backHref`, `actions`, `banner`, `tabs`, `activeTab`, `onTabChange`, `footer`, `children` |
| `FormPage` | Formulários com stepper opcional | `title`, `steps`, `activeStep`, `onStepChange`, `onSubmit`, `onCancel`, `submitLabel`, `children` |

### Padrão obrigatório para telas de listagem

Toda tela de listagem **deve** usar `ListPage` como wrapper. Padrão de toolbar validado:

```jsx
// ✅ Toolbar padrão — copiar EXATAMENTE em toda listagem nova
<ListPage
  title="Nome da Tela"
  subtitle="Descrição curta"
  actions={
    <>
      <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
      {/* Filtros avançados em modal — variant="secondary" normal, "danger" quando filtro ativo */}
      <Button variant="primary" size="sm" icon={Plus} onClick={...}>Nova X</Button>
    </>
  }
  filters={[
    { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar...' },
    { type: 'select', value: filtro, onChange: setFiltro, options: [...] },
  ]}
  loading={loading}
  empty={lista.length === 0 && !loading ? { title: '...', description: '...' } : null}
>
  {!loading && lista.length > 0 && (
    <DataTable columns={columns} rows={lista} rowKey="name" />
  )}
</ListPage>
```

**Regras:**
- `stats` prop: **não usar** — nenhuma listagem exibe cards de estatísticas acima da tabela
- `icon` nos filtros `type: 'search'`: passar a referência do componente Lucide (`icon: Search`), **nunca JSX** (`icon: <Search />`)
- Toggle grade/lista: raw `<button>` `h-7 w-7` com `bg-[#2563eb]` ativo — só quando a tela suporta dois modos de visualização (ex: DietaListagem)
- Paginação: usar via `DataTable` props (`page`, `pageSize`, `onPage`, `onPageSize`) — não duplicar no `ListPage` `pagination` prop
- Após DELETE: sempre recarregar do servidor (`await listarX(); setLista(data)`) — nunca confiar apenas em state local para confirmar exclusão

---

## Estrutura de Arquivos

```
src/
  api/
    client.js            # Axios instance com interceptors
    auth.js              # login/logout
    alunos.js            # CRUD Aluno
    dietas.js            # CRUD Dieta + Alimento + Grupos + Refeições Prontas + Medidas
    fichas.js            # CRUD Ficha de Treino
    anamneses.js
    feedbacks.js
  components/
    layout/
      AppLayout.jsx      # Shell com sidebar + Outlet
    ui/                  # Design system — importar sempre daqui
      index.js           # Barrel de todos os componentes
      Button.jsx
      FormGroup.jsx
      Input.jsx
      Select.jsx
      Textarea.jsx
      Autocomplete.jsx
      Modal.jsx
      CollapsibleBanner.jsx
      StatCard.jsx
      Tabs.jsx
      FooterTotais.jsx
      CategoricalBadge.jsx
      Badge.jsx / Card.jsx / Spinner.jsx / EmptyState.jsx
      PageHeader.jsx / ListItem.jsx / Avatar.jsx
    templates/           # Templates de página — usar para novas telas
      ListPage.jsx
      DetailPage.jsx
      FormPage.jsx
  pages/
    Login.jsx
    Dashboard.jsx
    Alunos/
      HubAlunos.jsx
    Dietas/
      DietaListagem.jsx
      DietaDetalhe.jsx   # Piloto de referência do DS v2
  store/
    authStore.js         # Zustand auth
    onboardingStore.js   # Contagens de catálogo, exibição de modal de boas-vindas (max 3x), dismiss do banner
  styles/
    tokens.js            # Tokens legados (tw.*) — preferir classes Tailwind diretas
  App.jsx                # Router
  main.jsx
```

---

## Convenções de Código

- Componentes: PascalCase, arquivos `.jsx`
- APIs: camelCase, arquivos `.js` em `src/api/`
- Campos Frappe: sempre usar o nome exato do DocType (inglês), nunca aliases em português
- Paginação: `limit_start = (page - 1) * limit` — nunca esquecer
- Debounce em buscas: 400ms com `useRef` + `clearTimeout` (ou usar `Autocomplete` que já faz isso)
- Loading states: usar `Spinner` ou prop `loading` dos componentes DS
- Erros de API: sempre logar com `console.error` e exibir mensagem amigável ao usuário
- Sem comentários desnecessários no código
- Sem abstrações prematuras — só criar helper quando usado 3+ vezes

---

## DocTypes Conhecidos e Campos Confirmados

### Dieta
`name`, `aluno`, `nome_completo`, `strategy`, `week_days`, `date`, `final_date`, `total_calories`
Refeições: `meal_1` a `meal_10` (0/1), `meal_N_label`, `meal_N_option_N` (0/1), `meal_N_option_N_label`, `meal_N_option_N_legend`, `meal_N_option_N_items` (child: Dieta Refeicao)
Item de refeição (Dieta Refeicao): `name`, `food`, `substitute` (0/1), `ref_weight`, `unit`, `medida_caseira`, `weight`, `protein`, `carbohydrate`, `lipid`, `fiber`, `calories`

### Alimento
`name`, `food`, `calories`, `protein`, `carbohydrate`, `lipid`, `fiber`, `food_group`, `ref_weight`, `unit`
**Atenção:** listagem retorna vazia via API nativa por restrição de permissão no Frappe. Pendente fix no backend.

### Aluno
`name`, `nome_completo`, `email` (campos de busca)

### Ficha
DocType: `Ficha` (não "Ficha de Treino")
Campos: `name`, `creation`, `aluno`, `nome_completo`, `profissional`, `estrutura_calculada`, `enabled`, `data_de_inicio`, `data_de_fim`, `objetivo`, `nivel`, `tipo_de_ciclo`, `orientacoes`, `orientacoes_aerobicos`, `orientacoes_aem`, `orientacoes_treino_a..f`, `treino_a..f_label`, `route`, `published`
Child tables:
- `dias_da_semana` (Ficha Semana): `dia_da_semana`, `treino`
- `planilha_de_treino_a..f` (Ficha Treino): `grupo_muscular`, `exercicio`, `series`, `repeticoes`, `descanso`, `observacao`, `carga_sugerida`, `video`, `plataforma_do_vídeo`, `intensidade` (JSON string), `primeiro`, `ultimo`, `titulo_do_exercicio_combinado`, `tipo_de_serie`
- `periodizacao` (Ficha Periodizacao): `semana`, `series`, `repeticoes`, `descanso`, `legenda`
- `periodizacao_dos_aerobicos`: `exercicios`, `frequencia`, `instrucao`, `video`, `plataforma_do_vídeo`
- `planilha_de_alongamentos_e_mobilidade` (Ficha Alongamento): `exercicio`, `series`, `observacoes`, `video`, `plataforma_do_vídeo`

### Treino Exercicio ⚠️
DocType real dos exercícios de treino (NÃO é `Exercicio`).
Campos: `name`, `nome_do_exercicio`, `grupo_muscular`, `video`, `plataforma_do_vídeo`, `intensidade_json`, `enabled`
Filtro obrigatório: `[["Treino Exercicio","enabled","=",1]]`

### Alongamento ⚠️
DocType real dos alongamentos (NÃO é `Exercicio de Alongamento`).
Campos: `name`, `nome_do_exercício` (com acento no í), `video`, `plataforma_do_vídeo`, `enabled`
Filtro obrigatório: `[["Alongamento","enabled","=",1]]`

### Exercicio Aerobico
Campos: `name`, `exercicio_aerobico`, `video`, `plataforma_do_vídeo`, `enabled`
Filtro obrigatório: `[["Exercicio Aerobico","enabled","=",1]]`

### Modelo Dieta
Wrapper leve com snapshot JSON da Dieta congelada (templates).
Campos: `name`, `titulo`, `descricao`, `categoria` (Emagrecimento / Hipertrofia / Manutenção / Off Season / Cutting / Outros), `tags`, `aluno_origem`, `dieta_origem`, `total_calories_ref`, `strategy_ref`, `enabled`, `snapshot_json` (Long Text)
API: `src/api/modelos.js` — `listarModelosDieta`, `buscarModeloDieta`, `criarModeloDieta`, `salvarModeloDieta`, `excluirModeloDieta`
Helpers: `dietaParaSnapshot(dieta)` (limpa metadados + campos do aluno) e `aplicarModeloDieta(snapshot, { aluno, nome_completo, date, final_date, dadosAntropometricos })`.
**Importante**: ao aplicar, NÃO mandar `profissional` no payload — Frappe auto-preenche (mesmo padrão de `criarDieta`).

### Modelo Ficha
Wrapper leve com snapshot JSON da Ficha congelada (templates).
Campos: `name`, `titulo`, `descricao`, `categoria` (Hipertrofia / Força / Resistência / Iniciante / Intermediário / Avançado / Reabilitação / Outros), `tags`, `objetivo_ref`, `nivel_ref`, `tipo_de_ciclo_ref`, `aluno_origem`, `ficha_origem`, `enabled`, `snapshot_json` (Long Text)
API: `src/api/modelos.js` — `listarModelosFicha`, `buscarModeloFicha`, `criarModeloFicha`, `salvarModeloFicha`, `excluirModeloFicha`
Helpers: `fichaParaSnapshot(ficha)` e `aplicarModeloFicha(snapshot, { aluno, nome_completo, data_de_inicio, data_de_fim })`.

---

## Problemas Conhecidos / Pendências

- **Alimento list vazia**: `GET /api/resource/Alimento` retorna `[]`. Causa: permissão de listagem não configurada. Fix no backend necessário.
- **Ficha de Treino**: `FichaListagem` e `FichaDetalhe` implementadas. DocType confirmado: `Ficha`.
- **TextareaComSugestoes**: componente com templates do Firestore ainda não implementado — aguarda decisão de Hérick sobre `behavior` default (`"replace"` vs `"append"`).
- **FooterTotais variant="inline"**: aguarda print da tela de fichas para especificar os chips coloridos por grupo muscular.
