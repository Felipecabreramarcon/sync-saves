use std::fs;
use std::io;
use std::path::Path;
use zip::ZipArchive;

pub fn extract_zip(zip_path: &Path, target_path: &Path) -> io::Result<()> {
    let file = fs::File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    // Check for single file marker
    if archive.len() > 0 {
        let file_names: Vec<String> = (0..archive.len())
            .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
            .collect();
        
        if file_names.contains(&"__SYNC_SINGLE_FILE__".to_string()) {
            // Single file mode
            let mut file = archive.by_name("__SYNC_SINGLE_FILE__")?;
            
            // Ensure parent directory of target file exists
            if let Some(parent) = target_path.parent() {
                 if !parent.exists() {
                     fs::create_dir_all(parent)?;
                 }
            }

            let mut outfile = fs::File::create(target_path)?;
            io::copy(&mut file, &mut outfile)?;
            return Ok(());
        }
    }

    // Normal folder restore
    // Ensure target directory exists
    if !target_path.exists() {
        fs::create_dir_all(target_path)?;
    }

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => target_path.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p)?;
                }
            }
            let mut outfile = fs::File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }

        // Set permissions on unix systems
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode))?;
            }
        }
    }

    Ok(())
}
