# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import contextlib
import os
import platform
import sys
sys.modules['FixTk'] = None

import shellingham
from PyInstaller.utils.hooks import collect_data_files, collect_entry_point, copy_metadata

with contextlib.suppress(Exception):
    if (
        ("conda" in sys.version or "Continuum" in sys.version)
        and shellingham.detect_shell()[0] == "bash"
        and os.name == "nt"
    ):
        os.environ["PATH"] = f"{sys.base_prefix}/Library/bin{os.pathsep}" + os.environ["PATH"]

a = Analysis(
    ['libresvip_tauri/__main__.py'],
    pathex=[
        ".",
    ],
    binaries=[],
    datas=(
        collect_data_files("libresvip_tauri", excludes=[], includes=["**/*.toml", "**/*.ico", "**/*.png", "**/*.html", "**/*.js", "**/*.css"]) +
        copy_metadata("pytauri_wheel") + collect_data_files("jyutping") + collect_data_files("xsdata") + collect_entry_point("xsdata.plugins.class_types")[0]
    ),
    hiddenimports=[
        "backports.zstd",
        "bidict",
        "construct_typed",
        "Cryptodome.Util.Padding",
        "svg",
        "google.protobuf.any_pb2",
        "jinja2",
        "jyutping",
        "ko_pron",
        "tatsu",
        "portion",
        "proto",
        "pydantic_extra_types.color",
        "pypinyin",
        "pysubs2",
        "pytauri_wheel.ext_mod",
        "pyzipper",
        "fsspec.implementations.memory",
        "upath.implementations.memory",
        "wanakana",
        "xsdata_pydantic.bindings",
        "xsdata_pydantic.fields",
        "xsdata_pydantic.hooks.class_type",
        "yaml",
        "yaml_ft",
        "zstandard",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'FixTk', 'tcl', 'tk', '_tkinter', 'tkinter', 'Tkinter', 'sqlite3',
        'pywintypes', 'pythoncom',
        'numpy', "pandas", "pandas.plotting", 'pandas.io.formats.style',
        'jedi', 'IPython', 'parso', 'plotly', 'matplotlib', 'matplotlib.backends', 'PIL', 'PIL.Image', 'zmq',
        'PySide6',
        'PySide6.QtCore',
        'PySide6.QtDataVisualization',
        'PySide6.QtGui',
        'PySide6.QtNetwork',
        'PySide6.QtOpenGL',
        'PySide6.QtOpenGLWidgets',
        'PySide6.QtWebChannel',
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWidgets',
        'PySide6.QtPositioning',
        'PySide6.QtPrintSupport',
        'PySide6.QtQuick',
        'PySide6.QtQuickWidgets',
        'PySide6.QtQml',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='libresvip-tauri',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['libresvip_tauri/icons/icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='libresvip-tauri',
)
