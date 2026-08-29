use std::env;
use std::path::PathBuf;

fn main() {
    tauri_build::build();

    cc::Build::new()
        .cpp(true)
        .flag_if_supported("/std:c++17")
        .flag_if_supported("-std=c++17")
        .file("bridge.cpp")
        .compile("rawaccel_bridge");
    let bindings = bindgen::Builder::default()
        .header("wrapper.hpp")
        .clang_arg("-xc++")
        .clang_arg("-std=c++17")
        .generate()
        .expect("Unable to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
