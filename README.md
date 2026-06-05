# LibreSVIP Tauri

## macOS 安装说明

如果下载 `.dmg` 后打开应用时提示「已损坏，无法打开」，通常是 macOS Gatekeeper 对下载应用添加了隔离标记。请先将应用拖入「应用程序」文件夹，然后打开「终端」执行以下命令：

```bash
xattr -dr com.apple.quarantine /Applications/LibreSVIP-Tauri.app
