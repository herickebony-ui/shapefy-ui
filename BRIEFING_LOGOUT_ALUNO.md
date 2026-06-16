# Briefing — Incidente: alunos deslogando sozinho (PROD)

> Documento autossuficiente para outra IA/dev executar o fix. Contém contexto, evidências, causa-raiz confirmada e a correção exata.

## 1. Sistema
- **Shapefy**: gestão fitness. Backend **Frappe (Python)** + frontend **React** (Vite). Repos: `shapefy-frappe-app` (back) e `shapefy-ui` (front).
- Área do aluno servida em **`shapefyapp.com`**, acessada por **app embedded (WebView)** e por **Safari no celular** (ambos WebKit/iOS).
- **Ambiente**: PROD (servidor Contabo). Existe um BETA separado para testes. **Não testar fix no prod sem validar antes.**

## 2. Autenticação do aluno (essencial)
- O aluno **não é User do Frappe**. O "token" do aluno é o campo **`senha_de_acesso`** do DocType `Aluno`.
- Enviado em **header `X-Aluno-Token: <senha>`** OU **cookie `aluno`** (fallback).
- Validação backend: `shapefy/api/_auth.py` → `get_aluno_logado()` busca `Aluno` por `{senha_de_acesso, enabled:1}`; se não achar → `frappe.AuthenticationError` (HTTP 401).
- Front (`src/api/client.js`):
  - **request interceptor**: se `localStorage.aluno_token` existe → manda `X-Aluno-Token`. (axios com `withCredentials: true`, então cookies vão junto.)
  - **response interceptor**: em **QUALQUER 401** → limpa `aluno_token`/`frappe_token`/etc do localStorage e **redireciona pra `/login`**.
- Login do aluno (React): `src/pages/Login.jsx` → chama `POST /api/method/shapefy.www.login_aluno.autenticar_aluno` → no sucesso chama `authStore.setAuthAluno(aluno, senha)`.
- `src/store/authStore.js` → `setAuthAluno` faz **apenas** `localStorage.setItem('aluno_token', token)`. **Não seta cookie.**
- Guard de rota: `src/App.jsx` (PrivateAlunoRoute, ~linha 84) → `const hasToken = !!localStorage.getItem('aluno_token')`. Se vazio → redireciona pra `/login`.

## 3. Sintoma
- **Alguns** alunos (não todos) são deslogados sozinhos. Acontece ao **fechar e reabrir** o app/Safari.
- Começou **após o deploy de ontem** da tela nova de aluno (React) em prod.
- O dono (admin) **não consegue reproduzir** (abre com frequência). Ocorre em **iPhone (Safari + app embedded)**.

## 4. Evidências coletadas
- No **nginx access log** do prod (`/var/log/nginx/access.log`), os 401 em `/api/...` são **todos do PROFISSIONAL** (`get_aluno_stats`, `/api/resource/Dieta|Aluno|Treino...` com filtro `profissional=`). **NÃO existe nenhum 401 em endpoint de aluno** (`/api/method/shapefy.api.aluno.*`).
  - Comando usado: `sudo grep " 401 " /var/log/nginx/access.log | grep "/api/" | awk '{print $7}' | sort | uniq -c | sort -rn | head -20`
- Logo: o logout do aluno **não é por 401**. É **client-side**: ao reabrir, o `localStorage.aluno_token` veio **vazio** → o guard (`App.jsx`) manda pro `/login` sem nem chamar a API (por isso zero 401 de aluno).
- O token do aluno mora **só no `localStorage`** (o `setAuthAluno` não seta cookie).
- O **fluxo antigo** (páginas Jinja) **setava o cookie `aluno`** (30 dias) — ver `shapefy/www/login_aluno.js` ("Cria o cookie chamado 'aluno' ... 30 dias") — e **todo o backend lê `X-Aluno-Token` OU `cookie 'aluno'`** (~15 arquivos em `shapefy/www/*` e `_auth.py`).

## 5. Causa-raiz (confirmada)
**O iOS Safari/WebKit (ITP) limpa o `localStorage`** (cap de ~7 dias de storage de script sem abrir o site como first-party, ou sob pressão de armazenamento). Vale tanto pro Safari quanto pra WebView do app (mesmo motor).

A tela **antiga** tinha um **cookie `aluno`** como rede de segurança (o backend lê esse cookie). A tela **nova (React)** passou a usar **só `localStorage`** e **não seta cookie**. Resultado: quando o iOS limpa o localStorage, **não há fallback** → o guard desloga.

Bate com tudo: só alguns (iOS/infrequentes), Safari + app (WebKit), admin não (abre direto), depois do deploy (perdeu o cookie), zero 401 (é client-side).

## 6. Fix (mínimo, restaura o cookie — server-side, melhor que o antigo)
**(A) Backend — `shapefy-frappe-app/shapefy/www/login_aluno.py`**
- Em `autenticar_aluno(senha)`, antes do `return aluno`, setar cookie **server-side** (o iOS NÃO aplica o cap de 7 dias em cookie de Set-Cookie first-party como faz no localStorage):
```python
	frappe.local.cookie_manager.set_cookie(
		"aluno", aluno.senha_de_acesso,
		max_age=60 * 60 * 24 * 180,  # 180 dias
		httponly=False,  # o guard React precisa ler o cookie
		samesite="Lax",
	)
```
- Em `logout_aluno`, expirar o cookie:
```python
	frappe.local.cookie_manager.set_cookie("aluno", "", max_age=0)
```
> Validar a assinatura de `cookie_manager.set_cookie` na versão do Frappe instalada (alguns aceitam `expires` em vez de `max_age`). Conferir se o site é https → considerar `secure=True`.

**(B) Front — helper que lê token do localStorage OU do cookie** (ex.: em `src/api/client.js` ou util):
```js
export const getAlunoToken = () => {
  const ls = localStorage.getItem('aluno_token')
  if (ls) return ls
  const m = document.cookie.match(/(?:^|;\s*)aluno=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
```

**(C) `src/api/client.js`** — no request interceptor, trocar `localStorage.getItem('aluno_token')` por `getAlunoToken()` ao montar o header `X-Aluno-Token`.

**(D) `src/App.jsx`** (guard PrivateAlunoRoute, ~linha 84) — trocar:
```js
const hasToken = !!localStorage.getItem('aluno_token')
```
por:
```js
const hasToken = !!getAlunoToken()
```

**Resultado**: localStorage limpo pelo iOS → o cookie segura a sessão (backend já lê o cookie + guard lê o cookie). Só desloga se o cookie TAMBÉM sumir (raro).

## 7. Deploy (PROD — cuidado)
- **Backend** (`shapefy/www/login_aluno.py`): aplicar a mudança, depois reiniciar os processos. No servidor de prod o restart é via supervisor: `sudo supervisorctl restart shapefy-web: shapefy-workers:` (ajustar nomes se diferirem) — OU `bench restart` se configurado.
- **Front** (`shapefy-ui`): a área do aluno é servida via Docker em `/opt/shapefy-ui` → rebuild: `git pull && docker compose up -d --build` (no padrão do projeto).
- **Backup do banco** antes (já é prática): `bench --site <site> backup --with-files`. (O site do bench pode ter nome próprio; conferir.)
- ⚠️ **Atenção ao `App.jsx`**: aplicar a mudança (D) no `App.jsx` REAL do prod (não copiar de outra branch — há uma branch com rotas extras de outra feature). É só 1 linha.
- **Fluxo recomendado**: aplicar e testar primeiro no BETA (mesma base), validar, depois subir no prod.

## 8. Validação
- **Antes** (confirmar a hipótese, com um aluno afetado): "depois que desloga, só refazer login resolve?" (deve ser sim) · "fica dias sem abrir o app?" · "é iPhone?".
- **Depois do fix**: logar como aluno, **fechar/reabrir** → continua logado. Teste duro: logar, **apagar o `localStorage` manualmente** (DevTools / simulando a limpeza do iOS) e recarregar → **deve continuar logado** (via cookie). Logout deve limpar localStorage **e** cookie.

## 9. Arquivos-chave
- `shapefy-frappe-app/shapefy/api/_auth.py` — validação (header X-Aluno-Token OU cookie `aluno`).
- `shapefy-frappe-app/shapefy/www/login_aluno.py` — `autenticar_aluno` / `logout_aluno` (onde setar o cookie).
- `shapefy-frappe-app/shapefy/www/login_aluno.js` — fluxo antigo (referência: setava cookie 30d).
- `shapefy-ui/src/api/client.js` — interceptors (header + logout em 401).
- `shapefy-ui/src/store/authStore.js` — `setAuthAluno` (só localStorage hoje).
- `shapefy-ui/src/pages/Login.jsx` — login do aluno.
- `shapefy-ui/src/App.jsx` — guard `PrivateAlunoRoute` (~linha 84).
