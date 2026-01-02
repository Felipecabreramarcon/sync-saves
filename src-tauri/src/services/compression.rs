use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::ZipWriter;

pub fn compress_folder(src_dir: &Path, dst_file: &Path) -> io::Result<()> {
    if !src_dir.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "Source directory not found"));
    }

    let file = File::create(dst_file)?;
    let mut zip = ZipWriter::new(file);
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let walk = WalkDir::new(src_dir);
    for entry in walk.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(src_dir)).unwrap();

        if path.is_file() {
            zip.start_file(name.to_string_lossy(), options)?;
            let mut f = File::open(path)?;
            io::copy(&mut f, &mut zip)?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy(), options)?;
        }
    }

    zip.finish()?;
    Ok(())
}

pub fn get_temp_zip_path(game_slug: &str) -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!("{}.zip", game_slug));
    path
}
