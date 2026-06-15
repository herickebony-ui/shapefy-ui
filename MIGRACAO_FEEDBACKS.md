# Plano — Migração de Feedbacks Históricos → Registro de Evolução (PROD) + ajustes

> Doc de execução vivo. **Consultar antes de tocar nessa migração.** Relacionado: `EVOLUCAO_CORPORAL.md` (Fase 4 — migração do histórico, dry-run já rodado no beta).

## ⚠️ ATENÇÃO MÁXIMA — isto roda em PRODUÇÃO
- O script roda no **banco REAL** (`shapefyapp.com` / prod), **não** no beta. É o único trabalho fora do beta neste projeto.
- **Backup ANTES** (responsabilidade do Hérick): `bench --site <prod> backup --with-files`.
- **Dry-run primeiro** (relatório que NÃO grava) → Hérick revisa totais + ambíguos → só então gravação real.
- **Idempotente**: re-rodar não duplica (vincula `registro_evolucao` no Feedback; se já existe, atualiza no lugar).
- Backend precisa estar deployado em prod com o script (decisão manual do Hérick).

## Contexto
A área de evolução agora tem fonte única (Registro de Evolução Física). Os feedbacks **antigos** (respondidos antes do fluxo novo) têm as fotos e o peso **embutidos como perguntas** do formulário. Queremos extrair isso para Registros, para aparecerem no painel/comparação como os novos.

## Padrão dos formulários (confirmado nos prints)
Todos os formulários do profissional seguem ordem fixa de perguntas (idx do child table):
| Template | Fotos | Peso |
|---|---|---|
| **Ouro / Premium (padrão)** | **Q2–Q9** = 8 fotos (Frente, Lado dir flex, Lado dir relax, Costas, Lado esq flex, Lado esq relax, Outras 1, Outras 2) | **Q10** (Texto Curto) |
| **Silver** | **Q2–Q7** = 6 fotos (sem as "Outras") | **Q8** (Texto Curto) |

## Regras da migração
- **Escopo:** Feedback com `status in ("Respondido", "Finalizado")`.
- **Excluir:** feedbacks cujo `formulario` seja o **"Avaliação Inicial"** do profissional `herickebony@gmail.com` (decisão adiada).
- **Fotos → conjunto padrão do profissional** (`Profissional.conjunto_fotos_padrao`), mapeadas **por posição**:
  - `Q2 → slot[0]`, `Q3 → slot[1]`, … na ordem do conjunto (que tem os 8 slots, incluindo as 2 "Outras").
  - **Silver**: preenche os 6 primeiros slots; os 2 "Outras" ficam **vazios** (sem foto).
  - Só cria foto no slot se a resposta tiver URL (foto vazia = slot vazio).
- **Peso → `Registro.peso`**: posição por template (Q10 padrão / Q8 Silver). Parse com vírgula→ponto, clamp 20–400; fora disso → ignora (ou pendência).
- **Data do Registro = `Feedback.modified`** (NÃO `data_resposta`, que está sendo limpo — ver Fase 0). Mantém fidedigno a quando o aluno respondeu.
- **`origem = "feedback"`**, vincula `Feedback.registro_evolucao`.

## Fase 0 — Bug: `data_resposta` limpo em Respondido→Finalizado (corrigir antes)
`feedback.py:before_save` zera `data_resposta` quando `status != "Respondido"` (ou seja, ao Finalizar). **Corrigir** para **não** limpar (preservar a data da primeira resposta). A migração usa `modified` de qualquer forma, mas o bug afeta feedbacks futuros. Deploy: beta primeiro, depois prod.

## Fase 1 — Script de migração (evoluir o existente)
- Base: `shapefy/evolucao/migracao.py → migracao_historico` (já mapeia fotos por rótulo; dry-run no beta deu 752 Registros, fotos OK, **0 pesos**).
- Ajustar para: (a) mapa **por posição/template** (Ouro vs Silver, detectando pelo `formulario`/título); (b) **peso** na posição certa; (c) fotos → **conjunto padrão** (por posição, mantendo slots "outras" e vazios no Silver); (d) data = `modified`; (e) **exclusão** do "Avaliação Inicial" do herickebony; (f) idempotente.
- **Dry-run** = relatório por template: nº feedbacks, nº fotos, nº pesos, ambíguos/sem-conjunto, excluídos. Sem gravar.

## Fase 2 — Telas (pós-migração) — front
- **Feedbacks Recebidos** = empacota **peso + fotos (conjunto) + formulário** num só lugar (composto já existe; revisar).
- **Comparação (2–3 feedbacks):** ordem correta = **fotos do conjunto (slots) primeiro, depois fotos do formulário**. 🐞 Hoje só mostra a resposta do formulário. **Quando configs diferem** (um com conjunto/peso, outro só formulário): **prevalece o último**.
- Telas dedicadas de **Peso** e de **Fotos** (a definir o formato).
- Comportamento quando o profissional pede **só formulário** (sem conjunto/peso): a definir.

## Fase 3 — Evolução como tela de "Acompanhamento"
- Tirar de "escondida no perfil do aluno" → item de sidebar com **seletor de aluno** (a tela é por-aluno). O menos confuso possível.

## Fase 4 — Avaliação Corporal usa Conjunto · **PRÓXIMA SESSÃO** (estrutural)
- Trocar os 8 slots fixos por **dropdown de Conjunto** → renderiza os slots dele → produz o Registro (origem=avaliacao) com esses slots.
- **Backend:** doctype `Avaliacao da Composicao Corporal` + campo `conjunto_fotos` (Link) + child table `fotos` (`slot_id, rotulo, ordem, url`, igual ao Registro); reescrever `sync_registro_evolucao` pra usar os slots do conjunto em vez de `AVALIACAO_PHOTOS`. **Front:** `AvaliacaoForm` com dropdown + slots dinâmicos. Deploy + `bench migrate` (beta primeiro).
- **Decisão (14/06):** **migrar também as avaliações antigas** — os 8 campos fixos viram linhas na child table e os campos fixos são aposentados. Com dry-run + revisão (mesmo rito da migração de feedbacks).
- Fazer em **sessão dedicada**: read-only diagnóstico → mostrar plano → patch determinístico com `.bak`.

## Conjunto-alvo (CONFIRMADO)
- Conjunto **"Fotos Padrão"** — `name = 1t2a8dn7am`, profissional `herickebony@gmail.com`, 8 slots (ordem 1–8):
  1. Frente `ed6cc5cb11` · 2. Lado direito ombro flexionado `3b45df1359` · 3. Lado direito braços relaxado `5937d6a41d` · 4. Costas `2997531b72` · 5. Lado esquerdo ombro flexionado `86243a7bcd` · 6. Lado esquerdo braços relaxado `54363eaace` · 7. Outras fotos 1 `f44cb081c5` · 8. Outras fotos 2 `a51d54d4bd`
- **Mapeamento por POSIÇÃO** (confirmado): `Q2→slot1, Q3→slot2, … Q9→slot8`. Silver: `Q2→slot1 … Q7→slot6`, slots 7–8 vazios.
- Rótulos dos 8 slots conferidos e únicos (slot 6 renomeado para "Lado esquerdo braços relaxado" em 14/06).

## Pendências / a confirmar
- [ ] Como o script chega na prod (deploy do backend em prod — decisão do Hérick).
- [ ] O conjunto "Fotos Padrão" (e `Profissional.conjunto_fotos_padrao`) precisa existir na PROD com esses slots antes da gravação real lá (o dry-run roda no beta, onde já existe).

## Definição de pronto
- Dry-run revisado em prod (totais coerentes, excluídos corretos, 0 ambíguos inesperados).
- Gravação real após backup; re-run idempotente (sem duplicar Registros).
- Painel/comparação mostram os Registros migrados (fotos por slot + peso) na ordem certa.

## Auditoria 14/06 — estado do código vs. alvo (aplicar na Fase 1 antes da PROD)
Pente fino confirmou que `shapefy/evolucao/migracao.py` **ainda NÃO** implementa o alvo deste doc. Corrigir antes de rodar na prod:
1. **Fotos por POSIÇÃO/template (não por rótulo).** Hoje usa `_classificar_foto(pergunta)` (heurística de rótulo). Trocar por mapa posicional Ouro Q2–Q9 / Silver Q2–Q7 → slots 1..N do conjunto `1t2a8dn7am`.
2. **Peso.** Hoje sai 0 pesos (heurística não pega). Ler a posição certa por template (Ouro Q10 / Silver Q8) e `_parse_peso`.
3. **Data = `Feedback.modified`.** Hoje usa `data_resposta||date` (e `data_resposta` é zerado ao Finalizar → cai no `date`, errado).
4. **Excluir "Avaliação Inicial" do herickebony@gmail.com.** Hoje não filtra.
5. **`conjunto_origem = 1t2a8dn7am`** no Registro migrado (rastreabilidade; hoje fica vazio).
6. Manter **idempotência** (pula feedback com `registro_evolucao` setado).

> Atenção: parte dos feedbacks de abril já têm Registro no **beta** (migração rodada lá). Antes de mexer, validar o estado real com as queries abaixo e decidir se re-migra o beta (limpar Registros origem=feedback órfãos/errados) ou só aplica na prod.

### Validação read-only no beta (`bench --site beta.shapefy.online console`)
```python
import frappe
# 1. Contagem por origem
for r in frappe.db.sql("SELECT origem, COUNT(*) c FROM `tabRegistro de Evolucao Fisica` GROUP BY origem", as_dict=True):
    print(r.origem, r.c)
# 2. Registros sem profissional (sumiriam do feed)
print("sem prof:", frappe.db.count("Registro de Evolucao Fisica", {"profissional": ["is", "not set"]}))
# 3. Feedbacks Respondido/Finalizado migrados vs faltando
tot = frappe.db.count("Feedback", {"status": ["in", ["Respondido", "Finalizado"]]})
lk = frappe.db.count("Feedback", {"status": ["in", ["Respondido", "Finalizado"]], "registro_evolucao": ["is", "set"]})
print("feedbacks resp/final:", tot, "| migrados:", lk, "| faltando:", tot - lk)
# 4. Registros feedback com peso preenchido (a migração nova deve subir esse nº)
print("feedback c/ peso:", frappe.db.count("Registro de Evolucao Fisica", {"origem": "feedback", "peso": ["is", "set"]}))
# 5. Fotos migradas com slot_id FORA do conjunto canônico (desalinham na comparação)
canon = {'ed6cc5cb11','3b45df1359','5937d6a41d','2997531b72','86243a7bcd','54363eaace','f44cb081c5','a51d54d4bd'}
fora = frappe.db.sql("""SELECT ref.slot_id, COUNT(*) c FROM `tabRegistro Evolucao Foto` ref
  JOIN `tabRegistro de Evolucao Fisica` reg ON ref.parent=reg.name
  WHERE reg.origem='feedback' GROUP BY ref.slot_id""", as_dict=True)
print("slots fora do canônico:", [(f.slot_id, f.c) for f in fora if f.slot_id not in canon])
# 6. Duplicatas (mesmo Registro linkado a >1 feedback)
print("dups:", frappe.db.sql("""SELECT registro_evolucao, COUNT(*) c FROM `tabFeedback`
  WHERE registro_evolucao IS NOT NULL GROUP BY registro_evolucao HAVING c>1"""))
```
