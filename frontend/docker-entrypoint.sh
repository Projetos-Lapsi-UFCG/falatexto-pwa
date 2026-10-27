#!/bin/sh
set -eu

# Executado pelo entrypoint da imagem nginx (scripts de /docker-entrypoint.d/)
# antes do nginx iniciar. Gera /config.js a partir das variáveis de ambiente,
# sobrescrevendo o arquivo de defaults de desenvolvimento incluído no build.
# Consumido por src/app/core/config/runtime-config.ts via window.__APP_CONFIG__.

CONFIG_FILE="/usr/share/nginx/html/config.js"

: "${VISION_API_SECRET_TOKEN:?VISION_API_SECRET_TOKEN é obrigatório}"
: "${ADMIN_PIN:?ADMIN_PIN é obrigatório}"

# Escapa barra invertida e aspa simples para uso seguro dentro de string JS.
escape_js() {
    printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g"
}

cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  visionApiToken: '$(escape_js "$VISION_API_SECRET_TOKEN")',
  adminPin: '$(escape_js "$ADMIN_PIN")',
};
EOF

echo "runtime-config: /config.js gerado a partir das variáveis de ambiente"
