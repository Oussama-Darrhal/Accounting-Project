#!/bin/sh
set -eu
cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

# php artisan serve workers read .env; keep it aligned with Compose.
php -r '
$keys = ["APP_KEY", "APP_URL", "FRONTEND_URL", "DB_CONNECTION", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD"];
$path = ".env";
$env = file_exists($path) ? file_get_contents($path) : "";
foreach ($keys as $key) {
    $value = getenv($key);
    if ($value === false || $value === "") {
        continue;
    }
    $line = $key."=".$value;
    $pattern = "/^".preg_quote($key, "/")."=.*$/m";
    if (preg_match($pattern, $env)) {
        $env = preg_replace($pattern, $line, $env);
    } else {
        $env = rtrim($env)."\n".$line."\n";
    }
}
file_put_contents($path, $env);
'

if [ -z "${APP_KEY:-}" ]; then
  php artisan key:generate --force --no-interaction
fi

php artisan config:clear --no-interaction >/dev/null 2>&1 || true

host="${DB_HOST:-postgres}"
port="${DB_PORT:-5432}"
echo "Waiting for Postgres at ${host}:${port}..."
i=0
until php -r "
\$dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', getenv('DB_HOST') ?: 'postgres', getenv('DB_PORT') ?: '5432', getenv('DB_DATABASE') ?: 'compta');
new PDO(\$dsn, getenv('DB_USERNAME') ?: 'compta', getenv('DB_PASSWORD') ?: 'compta');
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "Postgres is not reachable at ${host}:${port}"
    exit 1
  fi
  sleep 2
done

php artisan migrate --force --no-interaction
php artisan db:seed --force --no-interaction

exec php artisan serve --host=0.0.0.0 --port=8000
