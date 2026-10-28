{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  nodejs,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  wayland,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node_modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "contextcode";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    nodejs # for patchShebangs node_modules
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  postPatch = ''
    # NOTE: Relax Bun version check to be a warning instead of an error
    substituteInPlace packages/script/src/index.ts \
      --replace-fail 'throw new Error(`This script requires bun@''${expectedBunVersionRange}' \
                     'console.warn(`Warning: This script requires bun@''${expectedBunVersionRange}'
  '';

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .
    patchShebangs node_modules
    patchShebangs packages/*/node_modules

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.CONTEXTCODE_DISABLE_MODELS_FETCH = true;
  env.CONTEXTCODE_VERSION = finalAttrs.version;
  env.CONTEXTCODE_CHANNEL = "prod";
  env.NODE_OPTIONS = "--max-old-space-size=4096";

  buildPhase = ''
    runHook preBuild

    cd ./packages/cli
    bun --bun ./script/build.ts --single --skip-install

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/cli-*/bin/contextcode $out/bin/contextcode

    # OpenTUI dlopens Wayland for clipboard images.
    wrapProgram $out/bin/contextcode \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if running on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      } ${lib.optionalString stdenvNoCC.hostPlatform.isLinux ''
        --prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ wayland ]}
      ''}

    ln -s contextcode $out/bin/contextcode2

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # v2 dropped the `completion` subcommand; --completions is the global flag.
    # --completions also accepts sh, which emits the same script as bash.
    # staged to files, substitute below rejects anything that is not a regular file
    $out/bin/contextcode --completions bash > contextcode.bash
    $out/bin/contextcode --completions zsh > _contextcode
    $out/bin/contextcode --completions fish > contextcode.fish

    installShellCompletion --cmd contextcode \
      --bash contextcode.bash \
      --fish contextcode.fish \
      --zsh _contextcode

    # CONTEXTCODE_CLI_NAME is a build-time define, so the contextcode2 copies are
    # renamed rather than regenerated. --replace-fail is a global literal
    # substitution, so any lowercase contextcode that later appears in a
    # description or help text ships as contextcode2 in the contextcode2 copy.
    substitute contextcode.bash contextcode2.bash --replace-fail contextcode contextcode2
    substitute _contextcode _contextcode2 --replace-fail contextcode contextcode2
    substitute contextcode.fish contextcode2.fish --replace-fail contextcode contextcode2

    installShellCompletion --cmd contextcode2 \
      --bash contextcode2.bash \
      --fish contextcode2.fish \
      --zsh _contextcode2
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [ "HOME" "CONTEXTCODE_DISABLE_MODELS_FETCH" ];
  versionCheckProgramArg = "--version";

  passthru = {
    env = finalAttrs.env;
  };

  meta = {
    description = "The open source coding agent";
    homepage = "https://contextser.com";
    license = lib.licenses.mit;
    mainProgram = "contextcode";
    inherit (node_modules.meta) platforms;
  };
})
