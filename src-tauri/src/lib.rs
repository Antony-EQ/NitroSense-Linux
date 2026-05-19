use std::fs;
use std::process::Command;
use std::path::Path;

#[tauri::command]
fn get_system_model() -> String {
    if let Ok(name) = fs::read_to_string("/sys/class/dmi/id/product_name") {
        return name.trim().to_string();
    }
    "Acer Nitro".to_string()
}

#[tauri::command]
fn toggle_autostart(enable: bool) -> String {
    if let Some(home_dir) = std::env::var_os("HOME") {
        let autostart_dir = Path::new(&home_dir).join(".config/autostart");
        if !autostart_dir.exists() {
            let _ = fs::create_dir_all(&autostart_dir);
        }
        
        let desktop_file_path = autostart_dir.join("nitrosense.desktop");
        
        if enable {
            let desktop_entry = "[Desktop Entry]\n\
                                 Type=Application\n\
                                 Exec=nitrosense\n\
                                 Hidden=false\n\
                                 NoDisplay=false\n\
                                 X-GNOME-Autostart-enabled=true\n\
                                 Name=NitroSense\n\
                                 Comment=Acer Nitro Fan and RGB Control\n";
            let _ = fs::write(desktop_file_path, desktop_entry);
            return "Autostart enabled".to_string();
        } else {
            if desktop_file_path.exists() {
                let _ = fs::remove_file(desktop_file_path);
            }
            return "Autostart disabled".to_string();
        }
    }
    "Error determining home directory".to_string()
}

#[tauri::command]
fn get_cpu_temp() -> f32 {
    // Buscar dinámicamente el sensor 'coretemp'
    for i in 0..10 {
        let name_path = format!("/sys/class/hwmon/hwmon{}/name", i);
        if Path::new(&name_path).exists() {
            if let Ok(name) = fs::read_to_string(&name_path) {
                if name.trim() == "coretemp" {
                    let temp_path = format!("/sys/class/hwmon/hwmon{}/temp1_input", i);
                    if let Ok(content) = fs::read_to_string(temp_path) {
                        if let Ok(temp_milli) = content.trim().parse::<f32>() {
                            return temp_milli / 1000.0;
                        }
                    }
                }
            }
        }
    }
    // Fallback
    if let Ok(content) = fs::read_to_string("/sys/class/thermal/thermal_zone0/temp") {
        if let Ok(temp_milli) = content.trim().parse::<f32>() {
            return temp_milli / 1000.0;
        }
    }
    45.0
}

#[tauri::command]
fn get_gpu_temp() -> f32 {
    // Usar nvidia-smi para obtener temperatura real
    let output = Command::new("nvidia-smi")
        .arg("--query-gpu=temperature.gpu")
        .arg("--format=csv,noheader")
        .output();
        
    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        if let Ok(temp) = stdout.trim().parse::<f32>() {
            return temp;
        }
    }
    38.0
}

#[tauri::command]
fn set_fan_mode(mode: &str) -> String {
    if mode == "auto" {
        let _ = Command::new("nbfc").arg("set").arg("-a").output();
    } else if mode == "max" {
        let _ = Command::new("nbfc").arg("set").arg("-s").arg("100").output();
    } else if mode == "custom" {
        let _ = Command::new("nbfc").arg("set").arg("-s").arg("75").output();
    }
    format!("Fan mode set to: {}", mode)
}

#[tauri::command]
fn set_custom_fan_speed(speed: u8) -> String {
    // Evitar que envíe más del 100%
    let safe_speed = if speed > 100 { 100 } else { speed };
    let _ = Command::new("nbfc")
        .arg("set")
        .arg("-s")
        .arg(safe_speed.to_string())
        .output();
    format!("Custom fan speed set to: {}%", safe_speed)
}

#[tauri::command]
fn get_power_mode() -> String {
    let output = Command::new("powerprofilesctl").arg("get").output();
    if let Ok(out) = output {
        let mode = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !mode.is_empty() {
            return mode;
        }
    }
    "balanced".to_string()
}

#[tauri::command]
fn set_power_mode(mode: &str) -> String {
    let system_mode = match mode {
        "performance" => "performance",
        "power-saver" => "power-saver",
        _ => "balanced",
    };
    
    let _ = Command::new("powerprofilesctl")
        .arg("set")
        .arg(system_mode)
        .output();
        
    format!("Power mode set to: {}", mode)
}

#[tauri::command]
fn set_rgb_color(r: u8, g: u8, b: u8) -> String {
    let script_path = "/opt/turbo-fan/facer_rgb.py";
    if !Path::new(script_path).exists() {
        return "RGB Script not found. Driver not installed?".to_string();
    }
    
    for zone in 1..=4 {
        let _ = Command::new("python3")
            .arg(script_path)
            .arg("-m").arg("0")
            .arg("-z").arg(zone.to_string())
            .arg("-cR").arg(r.to_string())
            .arg("-cG").arg(g.to_string())
            .arg("-cB").arg(b.to_string())
            .output();
    }
    format!("RGB color set to ({}, {}, {})", r, g, b)
}

#[tauri::command]
fn set_rgb_effect(mode: u8, speed: u8) -> String {
    let script_path = "/opt/turbo-fan/facer_rgb.py";
    if !Path::new(script_path).exists() {
        return "RGB Script not found.".to_string();
    }
    
    let _ = Command::new("python3")
        .arg(script_path)
        .arg("-m").arg(mode.to_string())
        .arg("-s").arg(speed.to_string())
        .arg("-b").arg("100")
        .output();
        
    format!("Effect applied: mode {}", mode)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_cpu_temp,
            get_gpu_temp,
            set_fan_mode,
            set_custom_fan_speed,
            get_power_mode,
            set_power_mode,
            set_rgb_color,
            set_rgb_effect,
            get_system_model,
            toggle_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
