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

```bash
mkdir -p /opt/remnashop-web && cd /opt/remnashop-web
chmod +x deploy.sh
./deploy.sh configure
./deploy.sh install
```

Дальше HTTPS и переменные бота — в [установке](docs/ru/install/installation.mdx).

## Лицензия

MIT
