#!/usr/bin/env bash
# Deploy do BACKEND (shapefy-frappe-app/shapefy) pro beta via SSH/rsync.
# Sem GitHub, sem Marcos — usa só o seu acesso SSH ao beta.
#
# Uso (no Mac):   bash /Users/herickebony/shapefy-ui/deploy-beta.sh
# Vai pedir a SENHA DO SSH (a sua). Depois, na janela do beta, rode o migrate.

set -e

SRC="/Users/herickebony/shapefy-ui/shapefy-frappe-app/shapefy/"
DEST="shapefy@62.146.183.177:/opt/shapefy/apps/shapefy/shapefy/"

echo "→ Sincronizando backend pro beta..."
rsync -az --exclude='__pycache__' --exclude='*.pyc' "$SRC" "$DEST"

echo ""
echo "✅ Código no beta. Agora, na sua janela do beta, rode:"
echo "   bench --site beta.shapefy.online migrate"
echo "   sudo supervisorctl restart shapefy-web: shapefy-workers:"
