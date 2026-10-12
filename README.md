# LibreSVIP Tauri

## macOS 安装说明

如果下载 `.dmg` 后打开应用时提示「已损坏，无法打开」，通常是 macOS Gatekeeper 对下载应用添加了隔离标记。请先将应用拖入「应用程序」文件夹，然后打开「终端」执行以下命令：

```bash
xattr -dr com.apple.quarantine /Applications/LibreSVIP-Tauri.app
```

## Arch Linux 安装说明

如果 AppImage 在 Arch Linux 或其他滚动发行版上出现白屏、EGL 初始化失败，这是 AppImage 内捆绑的 WebKitGTK 所带 wayland 库与系统 mesa 驱动不兼容导致的（详见 [gitbutler#5282](https://github.com/gitbutlerapp/gitbutler/issues/5282)）。

可以尝试用系统自带的 wayland 库启动：

```bash
LD_PRELOAD=/usr/lib/libwayland-client.so ./LibreSVIP-Tauri*.AppImage
```