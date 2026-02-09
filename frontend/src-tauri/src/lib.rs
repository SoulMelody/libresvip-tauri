mod plugins;

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

static SIDECAR_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

fn start_sidecar() -> Result<Child, std::io::Error> {
    #[cfg(windows)]
    let result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("libresvip-tauri-server.exe")
            .current_dir(".")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
    };

    #[cfg(not(windows))]
    let result = Command::new("libresvip-tauri-server")
        .current_dir(".")
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
fn start_sidecar_command() -> Result<(), String> {
    if let Ok(mut guard) = SIDECAR_PROCESS.lock() {
        if let Some(child) = guard.as_ref() {
            if child.try_wait().is_ok_and(|status| status.is_none()) {
                Err(format!("Sidecar is already running (PID: {})", child.id()))
            } else {
                match start_sidecar() {
                    Ok(child) => {
                        *guard = Some(child);
                        Ok(())
                    }
                    Err(e) => Err(format!("Failed to start sidecar: {}", e)),
                }
            }
        } else {
            match start_sidecar() {
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_decorum::init())
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
