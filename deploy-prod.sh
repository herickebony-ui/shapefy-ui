#!/usr/bin/env bash
# Deploy do BACKEND (shapefy-frappe-app/shapefy) pra PROD via SSH/rsync.
# Sem GitHub (o push pro develop está bloqueado) — usa só o acesso SSH à prod.
#
# Uso (no MAC):
#   bash deploy-prod.sh --dry   # PREVIEW: mostra o que mudaria, NÃO altera nada
#   bash deploy-prod.sh         # aplica de verdade
#
# Pede a SENHA DO SSH (a do servidor de prod). Depois, NO SERVIDOR, rode:
#   cd /opt/shapefy
#   bench build --app shapefy
#   bench --site shapefy.online migrate
#   sudo supervisorctl restart shapefy-web: shapefy-workers:

set -e

SRC="/Users/herickebony/shapefy-ui/shapefy-frappe-app/shapefy/"
DEST="shapefy@217.216.49.29:/opt/shapefy/apps/shapefy/shapefy/"

if [ "$1" = "--dry" ]; then
  echo "→ DRY-RUN (preview — NADA será alterado na prod)..."
  # --no-t: nao tenta ajustar timestamp (arquivos da prod sao de outro dono -> "set
  # times: Operation not permitted"). Como usamos -c (checksum), o -t e' desnecessario.
  rsync -rlpDznc --no-t --itemize-changes --exclude='__pycache__' --exclude='*.pyc' "$SRC" "$DEST"
  echo ""
  echo "↑ Esses são os arquivos que MUDARIAM. Se for só o esperado, rode sem --dry."
else
  echo "→ Sincronizando backend pra PROD (shapefy.online)..."
  # --no-t: arquivos da prod sao de outro dono (set times falha). Com -c (checksum)
  # o timestamp e' irrelevante pra decidir o que transferir.
  rsync -rlpDzc --no-t --exclude='__pycache__' --exclude='*.pyc' "$SRC" "$DEST"
  echo ""
  echo "✅ Código na prod. Agora, NO SERVIDOR, rode:"
  echo "   cd /opt/shapefy"
  echo "   bench build --app shapefy"
  echo "   bench --site shapefy.online migrate"
  echo "   sudo supervisorctl restart shapefy-web: shapefy-workers:"
fi
