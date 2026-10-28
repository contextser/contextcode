<p align="center">
  <a href="https://contextser.com">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Context Code logo">
    </picture>
  </a>
</p>
<p align="center">El agente de programación con IA de código abierto.</p>
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

### Instalación

```bash
# YOLO
curl -fsSL https://contextser.com/install | bash

# Gestores de paquetes
npm i -g @contextcode/cli@latest      # o bun/pnpm/yarn
brew install contextser/tap/contextcode-v2 # macOS y Linux (recomendado, siempre al día)
brew install contextcode              # macOS y Linux (fórmula oficial de brew, se actualiza menos)
sudo pacman -S contextcode            # Arch Linux (Stable)
paru -S contextcode-beta              # Arch Linux (Latest from AUR)
mise use -g contextcode               # cualquier sistema
nix run github:contextser/contextcode  # Nix
```

> [!TIP]
> Elimina versiones anteriores a 0.1.x antes de instalar.

### App de escritorio (BETA)

Context Code también está disponible como aplicación de escritorio. Descárgala desde [contextser.com/download](https://contextser.com/download).

| Plataforma            | Descarga                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `contextcode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `contextcode-desktop-mac-x64.dmg`     |
| Windows               | `contextcode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, o AppImage         |

```bash
# macOS (Homebrew)
brew install --cask contextcode-desktop
```

#### Directorio de instalación

El script de instalación instala Context Code en `$HOME/.contextcode/bin`.

### Agentes

Context Code incluye dos agentes integrados que puedes alternar con la tecla `Tab`.

- **build** - Por defecto, agente con acceso completo para tareas de desarrollo
- **plan** - Agente de solo lectura para análisis y exploración de código
  - Deniega ediciones de archivos por defecto
  - Pide permiso antes de ejecutar comandos bash
  - Ideal para explorar codebases desconocidas o planificar cambios

Además, incluye un subagente **general** para búsquedas complejas y tareas de varios pasos.
Se usa internamente y se puede invocar con `@general` en los mensajes.

Más información sobre [agentes](https://contextser.com/docs/agents).

### Documentación

Para más información sobre cómo configurar Context Code, [**ve a nuestra documentación**](https://contextser.com/docs).

### Contribuir

Si te interesa contribuir a Context Code, lee nuestras [docs de contribución](./CONTRIBUTING.md) antes de enviar un pull request.

### Proyectos basados en Context Code

Si estás trabajando en un proyecto basado en Context Code y usas "contextcode" como parte del nombre, por ejemplo, "contextcode-dashboard" u "contextcode-mobile", agrega una nota en tu README para aclarar que no está hecho por el equipo de Context Code y que no está afiliado con nosotros de ninguna manera.

---

**Únete a nuestra comunidad** [Discord](https://contextser.com/discord) | [X.com](https://contextser.com)
