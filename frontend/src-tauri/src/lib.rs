mod plugins;

use std::io;
use std::path::PathBuf;
use std::process;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_decorum::WebviewWindowExt;
use tauri_plugin_prevent_default;

#[cfg(target_os = "windows")]
use tauri_plugin_prevent_default::PlatformOptions;

static SIDECAR_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

#[cfg(windows)]
fn sidecar_filename() -> &'static str {
    "libresvip-tauri-server.exe"
}

#[cfg(not(windows))]
fn sidecar_filename() -> &'static str {
    "libresvip-tauri-server"
}

fn resolve_sidecar_path(app: &AppHandle) -> Result<PathBuf, io::Error> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| io::Error::other(format!("failed to resolve resource directory: {e}")))?;
    let sidecar_path = resource_dir.join(sidecar_filename());
    if sidecar_path.is_file() {
        Ok(sidecar_path)
    } else {
        Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("sidecar not found at {}", sidecar_path.display()),
        ))
    }
}

fn start_sidecar(app: &AppHandle) -> Result<Child, std::io::Error> {
    let sidecar_path = resolve_sidecar_path(app)?;

    #[cfg(windows)]
    let result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&sidecar_path)
            .arg("--parent-pid")
            .arg(process::id().to_string())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
    };

    #[cfg(not(windows))]
    let result = Command::new(&sidecar_path)
        .arg("--parent-pid")
        .arg(process::id().to_string())
        .spawn();

    match result {
        Ok(child) => {
            println!("[LibreSVIP] Started sidecar (PID: {})", child.id());
            Ok(child)
        }
        Err(e) => {
            eprintln!("[LibreSVIP] Failed to start sidecar: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
fn start_sidecar_command(app: AppHandle) -> Result<(), String> {
    if let Ok(mut guard) = SIDECAR_PROCESS.lock() {
        if let Some(child) = guard.as_mut() {
            if child.try_wait().is_ok_and(|status| status.is_none()) {
                Err(format!("Sidecar is already running (PID: {})", child.id()))
            } else {
                match start_sidecar(&app) {
                    Ok(child) => {
                        *guard = Some(child);
                        Ok(())
                    }
                    Err(e) => Err(format!("Failed to start sidecar: {}", e)),
                }
            }
        } else {
            match start_sidecar(&app) {
                Ok(child) => {
                    *guard = Some(child);
                    Ok(())
                }
                Err(e) => Err(format!("Failed to start sidecar: {}", e)),
            }
        }
    } else {
        Err("Failed to acquire lock on sidecar process".to_string())
    }
}

fn stop_sidecar() {
    if let Ok(mut guard) = SIDECAR_PROCESS.lock() {
        if let Some(mut child) = guard.take() {
            println!("[LibreSVIP] Stopping sidecar (PID: {})", child.id());
            std::thread::spawn(move || {
                let _ = child.kill();
                let _ = child.wait();
            });
        }
    }
}

#[cfg(debug_assertions)]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_prevent_default::debug()
}

#[cfg(not(debug_assertions))]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::Flags;

    let mut builder = tauri_plugin_prevent_default::Builder::new().with_flags(Flags::all());

    #[cfg(target_os = "windows")]
    {
        use tauri_plugin_prevent_default::PlatformOptions;
        builder = tauri_plugin_prevent_default::Builder::new().platform(
            PlatformOptions::new()
                .general_autofill(false)
                .password_autosave(false)
                .browser_accelerator_keys(false)
                .default_context_menus(false)
                .default_script_dialogs(false),
        );
    }

    builder.build()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_decorum::init())
        .plugin(prevent_default())
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("[LibreSVIP] Window close requested, stopping sidecar...");
                stop_sidecar();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_sidecar_command,
            #[cfg(target_os = "macos")]
            plugins::mac_rounded_corners::enable_rounded_corners,
            #[cfg(target_os = "macos")]
            plugins::mac_rounded_corners::enable_modern_window_style,
            #[cfg(target_os = "macos")]
            plugins::mac_rounded_corners::reposition_traffic_lights,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
