mod plugins;

use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_decorum::init())
		.setup(|app| {
			let main_window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            {
                if let Err(e) = main_window.create_overlay_titlebar() {
                    log::error!("Failed to create overlay titlebar: {}", e);
                } else {
                    log::info!("Windows overlay titlebar created successfully");
                }
            }

			Ok(())
		})
        .invoke_handler(tauri::generate_handler![
            plugins::mac_rounded_corners::enable_rounded_corners,
            plugins::mac_rounded_corners::enable_modern_window_style,
            plugins::mac_rounded_corners::reposition_traffic_lights,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
