#!/usr/bin/env bash
export LIBRESVIP_TAURI_VERSION=`python -c "import importlib.metadata as importlib_metadata; print(importlib_metadata.version('libresvip-tauri'))"`
pydeploy libresvip_tauri.spec --venv .venv --appv $LIBRESVIP_TAURI_VERSION -a LibreSVIP-Tauri --id org.soulmelody.libresvip -l LICENSE -i ./libresvip_tauri/icons/icon.ico --nsis libresvip-tauri.nsi -y -f LibreSVIP-Tauri