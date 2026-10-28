#!/usr/bin/env bash
# render-homebrew.sh <sign-macos dir> <build-archives dir> <tap dir>: writes Formula contextcode-v2.rb with the
# hashes of the signed macOS and the Linux archives.
. "$(dirname "$0")/lib.sh"

macos=$1 archives=$2 tap=$3
sum() { sha256 "$1" | cut -c1-64; }
base="https://contextser.com/files/bin/$OPENCODE_VERSION"
cat > "$tap/contextcode-v2.rb" <<FORMULA
# typed: false
# frozen_string_literal: true

class ContextcodeV2 < Formula
  desc "Context Code V2 - the AI coding agent for the terminal"
  homepage "https://github.com/contextser/contextcode"
  version "$CONTEXTCODE_VERSION"
  license "MIT"

  depends_on "ripgrep"
  conflicts_with "contextcode", because: "both install an contextcode binary"

  on_macos do
    if Hardware::CPU.arm?
      url "$base/contextcode-darwin-arm64.zip"
      sha256 "$(sum "$macos/contextcode-darwin-arm64.zip")"
    else
      url "$base/contextcode-darwin-x64-baseline.zip"
      sha256 "$(sum "$macos/contextcode-darwin-x64-baseline.zip")"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "$base/contextcode-linux-arm64.tar.gz"
      sha256 "$(sum "$archives/contextcode-linux-arm64.tar.gz")"
    else
      url "$base/contextcode-linux-x64-baseline.tar.gz"
      sha256 "$(sum "$archives/contextcode-linux-x64-baseline.tar.gz")"
    end
  end

  def install
    bin.install "contextcode"
  end
end
FORMULA
cat "$tap/contextcode-v2.rb"
