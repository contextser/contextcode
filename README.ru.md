<p align="center">
  <a href="https://contextser.com">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Context Code logo">
    </picture>
  </a>
</p>
<p align="center">Открытый AI-агент для программирования.</p>
<p align="center">
  <a href="https://contextser.com/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@contextcode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@contextcode/cli?style=flat-square" /></a>
  <a href="https://github.com/contextser/contextcode/actions/workflows/release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/contextser/contextcode/release.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![Context Code Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://contextser.com)

---

### Установка

```bash
# YOLO
curl -fsSL https://contextser.com/install | bash

# Менеджеры пакетов
npm i -g @contextcode/cli@latest      # или bun/pnpm/yarn
brew install contextser/tap/contextcode-v2 # macOS и Linux (рекомендуем, всегда актуально)
brew install contextcode              # macOS и Linux (официальная формула brew, обновляется реже)
sudo pacman -S contextcode            # Arch Linux (Stable)
paru -S contextcode-beta              # Arch Linux (Latest from AUR)
mise use -g contextcode               # любая ОС
nix run github:contextser/contextcode  # Nix
```

> [!TIP]
> Перед установкой удалите версии старше 0.1.x.

### Десктопное приложение (BETA)

Context Code также доступен как десктопное приложение. Скачайте его с [contextser.com/download](https://contextser.com/download).

| Платформа             | Загрузка                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `contextcode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `contextcode-desktop-mac-x64.dmg`     |
| Windows               | `contextcode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` или AppImage        |

```bash
# macOS (Homebrew)
brew install --cask contextcode-desktop
```

#### Каталог установки

Скрипт установки устанавливает Context Code в `$HOME/.contextcode/bin`.

### Agents

В Context Code есть два встроенных агента, между которыми можно переключаться клавишей `Tab`.

- **build** - По умолчанию, агент с полным доступом для разработки
- **plan** - Агент только для чтения для анализа и изучения кода
  - По умолчанию запрещает редактирование файлов
  - Запрашивает разрешение перед выполнением bash-команд
  - Идеален для изучения незнакомых кодовых баз или планирования изменений

Также включен сабагент **general** для сложных поисков и многошаговых задач.
Он используется внутренне и может быть вызван в сообщениях через `@general`.

Подробнее об [agents](https://contextser.com/docs/agents).

### Документация

Больше информации о том, как настроить Context Code: [**наши docs**](https://contextser.com/docs).

### Вклад

Если вы хотите внести вклад в Context Code, прочитайте [contributing docs](./CONTRIBUTING.md) перед тем, как отправлять pull request.

### Разработка на базе Context Code

Если вы делаете проект, связанный с Context Code, и используете "contextcode" как часть имени (например, "contextcode-dashboard" или "contextcode-mobile"), добавьте примечание в README, чтобы уточнить, что проект не создан командой Context Code и не аффилирован с нами.

---

**Присоединяйтесь к нашему сообществу** [Discord](https://contextser.com/discord) | [X.com](https://contextser.com)
