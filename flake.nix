{
  description = "Noteweld development: Node 24, PostgreSQL 17 and Chromium";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = {self, nixpkgs}: let
    systems = ["x86_64-linux" "aarch64-linux"];
  in {
    devShells = nixpkgs.lib.genAttrs systems (system: let pkgs = nixpkgs.legacyPackages.${system}; in {
      default = pkgs.mkShell {
        packages = [pkgs.nodejs_24 pkgs.postgresql_17 pkgs.chromium pkgs.python313];
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
      };
    });
  };
}
