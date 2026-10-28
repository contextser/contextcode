<p align="center">
  <a href="https://contextser.com">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Context Code logo">
    </picture>
  </a>
</p>
<p align="center">Otwartoźródłowy agent kodujący AI.</p>
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

### Instalacja

```bash
# YOLO
curl -fsSL https://contextser.com/install | bash

# Menedżery pakietów
npm i -g @contextcode/cli@latest      # albo bun/pnpm/yarn
brew install contextser/tap/contextcode-v2 # macOS i Linux (polecane, zawsze aktualne)
brew install contextcode              # macOS i Linux (oficjalna formuła brew, rzadziej aktualizowana)
sudo pacman -S contextcode            # Arch Linux (Stable)
paru -S contextcode-beta              # Arch Linux (Latest from AUR)
mise use -g contextcode               # dowolny system
nix run github:contextser/contextcode  # Nix
```

> [!TIP]
> Przed instalacją usuń wersje starsze niż 0.1.x.

### Aplikacja desktopowa (BETA)

Context Code jest także dostępny jako aplikacja desktopowa. Pobierz ją z [contextser.com/download](https://contextser.com/download).

| Platforma             | Pobieranie                         |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `contextcode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `contextcode-desktop-mac-x64.dmg`     |
| Windows               | `contextcode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` lub AppImage        |

```bash
# macOS (Homebrew)
brew install --cask contextcode-desktop
```

#### Katalog instalacji

Skrypt instalacyjny instaluje Context Code w `$HOME/.contextcode/bin`.

### Agents

Context Code zawiera dwóch wbudowanych agentów, między którymi możesz przełączać się klawiszem `Tab`.

- **build** - Domyślny agent z pełnym dostępem do pracy developerskiej
- **plan** - Agent tylko do odczytu do analizy i eksploracji kodu
  - Domyślnie odmawia edycji plików
  - Pyta o zgodę przed uruchomieniem komend bash
  - Idealny do poznawania nieznanych baz kodu lub planowania zmian

Dodatkowo jest subagent **general** do złożonych wyszukiwań i wieloetapowych zadań.
Jest używany wewnętrznie i można go wywołać w wiadomościach przez `@general`.

Dowiedz się więcej o [agents](https://contextser.com/docs/agents).

### Dokumentacja

Więcej informacji o konfiguracji Context Code znajdziesz w [**dokumentacji**](https://contextser.com/docs).

### Współtworzenie

Jeśli chcesz współtworzyć Context Code, przeczytaj [contributing docs](./CONTRIBUTING.md) przed wysłaniem pull requesta.

### Budowanie na Context Code

Jeśli pracujesz nad projektem związanym z Context Code i używasz "contextcode" jako części nazwy (na przykład "contextcode-dashboard" lub "contextcode-mobile"), dodaj proszę notatkę do swojego README, aby wyjaśnić, że projekt nie jest tworzony przez zespół Context Code i nie jest z nami w żaden sposób powiązany.

---

**Dołącz do naszej społeczności** [Discord](https://contextser.com/discord) | [X.com](https://contextser.com)
