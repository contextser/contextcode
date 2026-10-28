<p align="center">
  <a href="https://contextser.com">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo do Context Code">
    </picture>
  </a>
</p>
<p align="center">O agente de programação com IA de código aberto.</p>
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

### Instalação

```bash
# YOLO
curl -fsSL https://contextser.com/install | bash

# Gerenciadores de pacotes
npm i -g @contextcode/cli@latest      # ou bun/pnpm/yarn
brew install contextser/tap/contextcode-v2 # macOS e Linux (recomendado, sempre atualizado)
brew install contextcode              # macOS e Linux (fórmula oficial do brew, atualiza menos)
sudo pacman -S contextcode            # Arch Linux (Stable)
paru -S contextcode-beta              # Arch Linux (Latest from AUR)
mise use -g contextcode               # qualquer sistema
nix run github:contextser/contextcode  # Nix
```

> [!TIP]
> Remova versões anteriores a 0.1.x antes de instalar.

### App desktop (BETA)

O Context Code também está disponível como aplicativo desktop. Baixe em [contextser.com/download](https://contextser.com/download).

| Plataforma            | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `contextcode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `contextcode-desktop-mac-x64.dmg`     |
| Windows               | `contextcode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` ou AppImage         |

```bash
# macOS (Homebrew)
brew install --cask contextcode-desktop
```

#### Diretório de instalação

O script de instalação instala o Context Code em `$HOME/.contextcode/bin`.

### Agents

O Context Code inclui dois agents integrados, que você pode alternar com a tecla `Tab`.

- **build** - Padrão, agent com acesso total para trabalho de desenvolvimento
- **plan** - Agent somente leitura para análise e exploração de código
  - Nega edições de arquivos por padrão
  - Pede permissão antes de executar comandos bash
  - Ideal para explorar codebases desconhecidas ou planejar mudanças

Também há um subagent **general** para buscas complexas e tarefas em várias etapas.
Ele é usado internamente e pode ser invocado com `@general` nas mensagens.

Saiba mais sobre [agents](https://contextser.com/docs/agents).

### Documentação

Para mais informações sobre como configurar o Context Code, [**veja nossa documentação**](https://contextser.com/docs).

### Contribuir

Se você tem interesse em contribuir com o Context Code, leia os [contributing docs](./CONTRIBUTING.md) antes de enviar um pull request.

### Construindo com Context Code

Se você estiver trabalhando em um projeto relacionado ao Context Code e estiver usando "contextcode" como parte do nome (por exemplo, "contextcode-dashboard" ou "contextcode-mobile"), adicione uma nota no README para deixar claro que não foi construído pela equipe do Context Code e não é afiliado a nós de nenhuma forma.

---

**Junte-se à nossa comunidade** [Discord](https://contextser.com/discord) | [X.com](https://contextser.com)
