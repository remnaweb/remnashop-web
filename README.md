# remnashop-web

Веб-кабинет и Telegram Mini App для [RemnaShop](https://remnashop.mintlify.app/docs/ru/overview/introduction).

Ставится рядом с уже работающим ботом. Код `/opt/remnashop` менять не нужно.

## Документация

Документация в формате Mintlify (как у RemnaShop):

| Страница | Файл |
| --- | --- |
| Что это | [docs/ru/overview/introduction.mdx](docs/ru/overview/introduction.mdx) |
| Требования | [docs/ru/install/requirements.mdx](docs/ru/install/requirements.mdx) |
| Установка | [docs/ru/install/installation.mdx](docs/ru/install/installation.mdx) |
| Письма (регистрация / сброс пароля) | [docs/ru/install/email.mdx](docs/ru/install/email.mdx) |
| Кнопка «Личный кабинет» в боте | [docs/ru/install/connect-bot.mdx](docs/ru/install/connect-bot.mdx) |
| Переменные | [docs/ru/install/environment-variables.mdx](docs/ru/install/environment-variables.mdx) |
| Caddy | [docs/ru/reverse-proxies/caddy.mdx](docs/ru/reverse-proxies/caddy.mdx) |
| Ошибки | [docs/ru/install/troubleshooting.mdx](docs/ru/install/troubleshooting.mdx) |

Корень документации: [`docs.json`](docs.json). Локальный просмотр: `npx mint dev`.

## Быстрый старт

Один скрипт. Сначала впиши домен в `install.conf`, потом запусти.

```bash
git clone https://github.com/remnaweb/remnashop-web.git /opt/remnashop-web
cd /opt/remnashop-web
cp install.conf.example install.conf
nano install.conf
```

В файле заполни хотя бы это (свой домен, не example.com):

```bash
DOMAIN=lk.твой-домен.ru
```

Остальное можно оставить пустым — скрипт найдёт бота и сеть сам.

```bash
chmod +x install.sh
./install.sh
```

Останется URL Mini App в [@BotFather](https://t.me/BotFather). Письма (Resend/SMTP) — `./deploy.sh configure`. Подробности: [установка](docs/ru/install/installation.mdx).

## Лицензия

MIT
