# CLAUDE — Reforma: Fonte Única de Evolução Corporal

> **Consultar SEMPRE antes de trabalhar nesta reforma.** Doc de execução vivo. Plano de origem: `~/.claude/plans/contexto-do-problema-no-lazy-wind.md`.
> Status (31/05 noite): **Fase 1 VALIDADA no beta** · Fase 2 discovery + Fase 4 dry-run rodados · API do front pronta · UI pendente.

## Progresso (sessão noturna 31/05)
**Deploy no beta agora é por chave SSH + rsync** (sem GitHub/Marcos): chave `~/.ssh/shapefy_beta` autorizada no beta; deploy via `rsync ... shapefy@62.146.183.177:/opt/shapefy/apps/shapefy/shapefy/` + `bench --site beta.shapefy.online migrate`. Site do bench = **`beta.shapefy.online`**. **Restart precisa de sudo (senha)** → o Hérick roda `sudo supervisorctl restart shapefy-web: shapefy-workers:` pro site ao vivo pegar o código Python.

- **Fase 1 — VALIDADA** (smoke test no beta, tudo OK): doctypes criados, slot_id gerado+estável, load_slots congela slots, peso_atual derivado, **Avaliação produz Registro** (origem=avaliacao) e cascade no delete.
- **Fase 2 — discovery rodado** (`shapefy.evolucao.conversao.relatorio_conversao`): 6 formulários, 60 fotos (49 alta-confiança, 11 baixa), **0 perguntas de peso** em template. Heurística Frente/Costas/Lados acerta. **Decisão pendente**: avaliação postural (30 fotos) COLAPSA poses distintas em `costas`/`lado_*` — pra postural, tratar como **individual**, não canônico.
- **Fase 4 — dry-run rodado** (`shapefy.evolucao.migracao.migracao_historico`): **764 feedbacks → 752 Registros**, 4620 fotos alta-confiança + 315 individuais, **0 pesos**, 0 ambíguos. Idempotente. **NÃO gravado** — espera revisão; rodar real com `--kwargs "{'dry_run': 0}"`.
- **Front — API pronta** (`src/api/conjuntos.js`, `src/api/evolucao.js`), build OK. **UI pendente** (CRUD Conjunto, wizard aluno, painel profissional) — não foi deployada (não dá pra validar UX headless; risco no front do beta).

**Achado-chave**: peso NUNCA foi coletado via feedback (0 em template e 0 em histórico). Peso atual virá só das Avaliações até os profs ativarem `incluir_peso`.

## Objetivo
Unificar o estado corporal do aluno (peso, foto, medida) — hoje fragmentado em `Aluno.weight`, `Avaliacao da Composicao Corporal` e perguntas soltas do `Feedback` — numa entidade única **Registro de Evolução Física**. Dela derivam: peso atual, gráfico de peso e galeria/comparação de fotos.

## Deploy no beta (método do Marcos)
Paths no beta: backend `/opt/shapefy/apps/shapefy`, front `/opt/shapefy-ui`. **Site do bench = `shapefy.online`** (URL pública pode ser beta.shapefyapp.com).

**Local (este Mac):** alterar → `git commit` → `git push` (na pasta do repo alterado).
**No beta (SSH `shapefy@62.146.183.177`, senha com o Hérick):**
- Backend: `cd /opt/shapefy/apps/shapefy && git pull && bench --site shapefy.online migrate && bench restart`
- Front: `cd /opt/shapefy-ui && git pull && docker compose up -d --build`

Como o trabalho é por **branch de fase**, o beta precisa estar **na branch da fase** pra testar (`git fetch origin && git checkout <branch>`), depois `git checkout develop` pra voltar. O Hérick é quem roda o SSH; o agente só prepara os comandos.

## Ambiente e regras de execução
- **Trabalho só no BETA** (`beta.shapefyapp.com`) — banco/máquina separados de prod. **Nunca deploy em prod** (decisão manual do Hérick).
- Prod do aluno = `shapefyapp.com`. Front = `shapefy-ui`; backend = `shapefy-frappe-app/` (app `shapefy`, repo próprio, gitignored).
- **Uma fase = uma branch = um PR**, a partir de `develop`. Nome: `feat/registro-evolucao-faseN-descricao`.
- **Read-only primeiro** → mostrar diagnóstico ao Hérick → editar só após confirmar.
- Edições determinísticas (patch Python com validação de âncora, `.bak` antes). `bench migrate` após doctype; `bench restart` após .py.
- **bench/SQL no beta**: postar o comando no chat e aguardar o OK do Hérith — não rodar sozinho.
- Migração de dados: **dry-run primeiro** (não grava), revisar ambíguos, depois gravar. Idempotente.

## Decisões travadas
1. Doctype novo `Registro de Evolução Física` (fonte única) + **Avaliação produtora** (linka um Registro; mantém dobras + fórmulas %G). Peso mora só no Registro.
2. `slot_id` **fixo/imutável** = chave de alinhamento na comparação (renomear rótulo não quebra série).
3. **Vocabulário canônico de slots = as 8 fotos da Avaliação** → foto de avaliação e de feedback alinham no mesmo grid.
4. **Peso atual = derivado puro** (sem campo no Aluno); em listas, batch `GROUP BY aluno`.
5. Ciclo de vida por `origem`: `avaliacao` → Avaliação é dona (projeção read-only, cascade delete, excluir Registro avulso bloqueado); `feedback` → editável pelo profissional, Feedback só linka contexto, **excluir Feedback mantém o Registro**; `manual` → standalone.
6. Foto inicial: `conjunto_fotos_padrao` no Profissional, congelado nos feedbacks automáticos (`incluir_peso=1`).
7. Migração: híbrido por confiança (alinha alta-confiança no slot canônico, resto vira registro individual) + doctype `Pendência de Migração`. `Aluno.weight` legado ignorado; peso fora de 20–400 kg → pendência.
8. **Sequência crítica**: Fase 2 (conversão template→Conjunto) **precede** Fase 3 (wizard do aluno) pra fechar a janela de dupla-coleta.

## Modelo de dados
**Novos doctypes** (`shapefy/shapefy/doctype/`):
- `Conjunto de Fotos`: `titulo`, `profissional`, `enabled` + child `Conjunto de Fotos Slot` (`slot_id`, `rotulo`, `ordem`, `obrigatorio`).
- `Registro de Evolução Física`: `aluno`, `profissional`, `data`, `origem` (avaliacao/feedback/manual), `peso`, `conjunto_origem` + child `Registro Evolucao Foto` (`slot_id`, `rotulo`, `ordem`, `url`). Método `load_slots()` (espelho de `load_perguntas()`).
- `Pendência de Migração` (Fase 4): `aluno`, `profissional`, `feedback_origem`, `tipo`, `valor_cru`, `melhor_palpite`, `resolvido`, `acao`.

**Alterações:**
- `Avaliacao da Composicao Corporal`: + `registro_evolucao` (Link); `before_save`/`after_save` faz upsert do Registro (origem=avaliacao); `on_trash` cascade.
- `Feedback Agendado`: + `conjunto_fotos` (Link opcional), `incluir_peso` (Check default 1).
- `Profissional`: + `conjunto_fotos_padrao` (Link opcional).
- `Feedback`: + `registro_evolucao` (Link read-only) + congelar `conjunto_fotos`/`incluir_peso` na criação.
- `Aluno`: peso atual derivado (endpoint), parar de tratar `Aluno.weight` como verdade.

## Fases
- **0** — Validação (Hérick; dados reais dos 13 profissionais). Fora deste agente.
- **1** — Doctypes backend + `load_slots()` + job de imagem pública varrendo Registro + endpoint de peso derivado.
- **2** — Conversão template→Conjunto (patch) + remover perguntas foto/peso dos templates + UI agendamento. **Antes do go-live do fluxo novo.**
- **3** — Wizard do aluno (Fotos→Peso→Perguntas), cria Registro origem=feedback ao enviar.
- **4** — Migração do histórico (dry-run → revisar → gravar) + Pendência de Migração.
- **5** — Painel do profissional: comparação por slot_id, gráfico de peso, CRUD Conjunto, lançamento manual, Feedbacks Recebidos composto.

## Mapa de arquivos-chave (reuso, não recriar)
- Backend: `feedback.py:52` (`load_perguntas` → molde `load_slots`), `feedback.py:113` (`process_feedback_images_to_public`), `_avaliacoes.py:322` (`avaliacao_comparar` → `evolucao_comparar`), `avaliacao_helpers.py` (`PHOTOS`, fórmulas), `api/aluno.py:168` (`responder_feedback`), `aluno.py` (`create_feedbacks`).
- Front: `FeedbackResposta.jsx` (vira wizard), `FormularioRespostas.jsx`/`DistribuirFotosModal` (fonte=slots), `CampoImagem`/`CampoInt`, `uploadFotoAluno` (`api/aluno.js:137`, is_private=0/optimize=0), `AvaliacaoComparar.jsx:118` (`PhotoMatrix`), `EvolutionChart.jsx`, `FormularioBuilder.jsx` (molde p/ CRUD Conjunto).

## Marco de retorno (31/05/2026)
Front `shapefy-ui`: `main`@`3b767bf`. Backend `shapefy`: `develop`@`1869670`.
