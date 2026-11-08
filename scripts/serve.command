#!/bin/zsh
set -e
cd "${0:A:h}/.."
if [[ -x "$PWD/.tools/node-v24.22.2-darwin-arm64/bin/node" ]]; then
  export PATH="$PWD/.tools/node-v24.22.2-darwin-arm64/bin:$PATH"
fi
if ! command -v node >/dev/null; then
  echo 'Для запуска нужен Node.js 24 или новее: https://nodejs.org/'
  read -r '?Нажмите Enter, чтобы закрыть окно.'
  exit 1
fi
if [[ ! -d node_modules ]]; then npm ci; fi
npm run build
export LOCATION_PORT=3003
echo 'Сервер демонстрации: http://localhost:3003'
echo 'Оставьте это окно открытым. Остановка: Ctrl+C.'
echo 'Для внешней ссылки в другом окне: cloudflared tunnel --url http://localhost:3003'
(sleep 2; open http://localhost:3003) &
caffeinate -i npm start
