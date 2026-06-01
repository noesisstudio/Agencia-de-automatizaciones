#!/bin/bash
# Instala LaunchAgent para arrancar el chatbot al iniciar sesión en macOS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/post-reinicio.sh"
PLIST_SRC="$ROOT/scripts/com.openix.chatbot.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.openix.chatbot.plist"
LABEL="com.openix.chatbot"

if [ ! -x "$SCRIPT" ]; then
  chmod +x "$SCRIPT"
fi

# Sustituir ruta del proyecto en el plist
mkdir -p "$HOME/Library/LaunchAgents"
sed "s|__PROJECT_ROOT__|${ROOT}|g" "$PLIST_SRC" >"$PLIST_DST"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true

echo ""
echo "Arranque automático instalado."
echo "  Plist: $PLIST_DST"
echo "  Logs:  $ROOT/chatbot-backend/logs/"
echo ""
echo "Para probar ahora: $SCRIPT"
echo "Para desinstalar: launchctl bootout gui/$(id -u)/${LABEL} && rm \"$PLIST_DST\""
