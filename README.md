# LibreSVIP Tauri

## macOS 安装说明

如果下载 `.dmg` 后打开应用时提示「已损坏，无法打开」，通常是 macOS Gatekeeper 对下载应用添加了隔离标记。请先将应用拖入「应用程序」文件夹，然后打开「终端」执行以下命令：

```bash
xattr -dr com.apple.quarantine /Applications/LibreSVIP-Tauri.app
```

## Arch Linux 安装说明

如果 AppImage 在 Arch Linux 或其他滚动发行版上出现白屏、EGL 初始化失败，可以解压 AppImage 并改用系统自带的 GTK、WebKitGTK 和图形库运行：

```bash
chmod +x LibreSVIP-Tauri*.AppImage
./LibreSVIP-Tauri*.AppImage --appimage-extract
mv squashfs-root/usr/lib squashfs-root/usr/lib.bundled
./squashfs-root/AppRun
```

此方法要求系统已经安装应用运行所需的 GTK3、WebKitGTK 4.1 等依赖。需要恢复 AppImage 自带库时，执行：

```bash
mv squashfs-root/usr/lib.bundled squashfs-root/usr/lib
```
