use serde::{Deserialize, Serialize};
use std::time::Duration;

const PCGW_API: &str = "https://www.pcgamingwiki.com/w/api.php";

#[derive(Debug, Clone, Serialize)]
pub struct PcgwSearchResult {
    pub title: String,
    pub pageid: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PcgwSavePath {
    pub os: String,
    pub raw: String,
    pub expanded: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PcgwSaveLocations {
    pub title: String,
    pub paths: Vec<PcgwSavePath>,
}

#[derive(Debug, Deserialize)]
struct MwQueryResponse {
    query: Option<MwQuery>,
}

#[derive(Debug, Deserialize)]
struct MwQuery {
    search: Vec<MwSearchItem>,
}

#[derive(Debug, Deserialize)]
struct MwSearchItem {
    title: String,
    pageid: u64,
}

#[tauri::command]
pub async fn pcgw_search_games(
    query: String,
    limit: Option<u32>,
) -> Result<Vec<PcgwSearchResult>, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(vec![]);
    }

    let limit = limit.unwrap_or(8).clamp(1, 20);

    let client = reqwest::Client::builder()
        .user_agent("sync-saves/0.1 (PCGW lookup)")
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let resp = client
        .get(PCGW_API)
        .query(&[
            ("action", "query"),
            ("list", "search"),
            ("srsearch", query),
            ("srlimit", &limit.to_string()),
            ("format", "json"),
        ])
        .send()
        .await
        .map_err(|e| format!("PCGW request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp
            .text()
            .await
            .unwrap_or_else(|_| "<failed to read body>".to_string());
        let snippet = body.chars().take(500).collect::<String>();
        return Err(format!("PCGW returned HTTP {status}. Body: {snippet}"));
    }

    let json: MwQueryResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse PCGW response: {e}"))?;

    let results = json
        .query
        .map(|q| {
            q.search
                .into_iter()
                .map(|s| PcgwSearchResult {
                    title: s.title,
                    pageid: s.pageid,
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(results)
}

#[derive(Debug, Deserialize)]
struct MwParseResponse {
    parse: Option<MwParse>,
}

#[derive(Debug, Deserialize)]
struct MwParse {
    wikitext: Option<MwWikiText>,
}

#[derive(Debug, Deserialize)]
struct MwWikiText {
    #[serde(rename = "*")]
    text: String,
}

#[tauri::command]
pub async fn pcgw_get_save_locations(title: String) -> Result<PcgwSaveLocations, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("Title is required".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("sync-saves/0.1 (PCGW lookup)")
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let resp = client
        .get(PCGW_API)
        .query(&[
            ("action", "parse"),
            ("page", title),
            ("prop", "wikitext"),
            ("format", "json"),
        ])
        .send()
        .await
        .map_err(|e| format!("PCGW request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp
            .text()
            .await
            .unwrap_or_else(|_| "<failed to read body>".to_string());
        let snippet = body.chars().take(500).collect::<String>();
        return Err(format!("PCGW returned HTTP {status}. Body: {snippet}"));
    }

    let json: MwParseResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse PCGW response: {e}"))?;

    let wikitext = json
        .parse
        .and_then(|p| p.wikitext)
        .map(|w| w.text)
        .unwrap_or_default();

    let mut paths = vec![];

    for template in extract_templates_named(&wikitext, "Game data/saves") {
        let params = split_template_params(&template);
        if params.len() < 2 {
            continue;
        }

        let os = params[0].trim().to_string();
        let raw_path = params[1].trim().to_string();

        // Minimal: focus on Windows-ish entries (including variations)
        let os_lc = os.to_lowercase();
        if !(os_lc.contains("windows") || os_lc == "win") {
            continue;
        }

        if raw_path.is_empty() {
            continue;
        }

        let expanded = expand_windows_path_tokens(&raw_path);
        paths.push(PcgwSavePath {
            os,
            raw: raw_path,
            expanded,
        });
    }

    // De-dupe by expanded/raw
    paths.sort_by(|a, b| {
        a.expanded
            .as_deref()
            .unwrap_or(&a.raw)
            .cmp(b.expanded.as_deref().unwrap_or(&b.raw))
    });
    paths.dedup_by(|a, b| {
        a.os == b.os
            && a.raw == b.raw
            && a.expanded.as_deref().unwrap_or("") == b.expanded.as_deref().unwrap_or("")
    });

    Ok(PcgwSaveLocations {
        title: title.to_string(),
        paths,
    })
}

fn extract_templates_named(wikitext: &str, template_name: &str) -> Vec<String> {
    let mut results = vec![];
    let mut i = 0;
    let needle = format!("{{{{{}", template_name);

    while let Some(rel) = wikitext[i..].find(&needle) {
        let start = i + rel;
        if let Some((end, body)) = extract_balanced_template(wikitext, start) {
            results.push(body);
            i = end;
        } else {
            break;
        }
    }

    results
}

// Returns (end_index, template_inner_body_without_outer_braces)
fn extract_balanced_template(s: &str, start: usize) -> Option<(usize, String)> {
    if !s[start..].starts_with("{{") {
        return None;
    }

    let bytes = s.as_bytes();
    let mut idx = start;
    let mut depth: i32 = 0;

    while idx + 1 < bytes.len() {
        if bytes[idx] == b'{' && bytes[idx + 1] == b'{' {
            depth += 1;
            idx += 2;
            continue;
        }
        if bytes[idx] == b'}' && bytes[idx + 1] == b'}' {
            depth -= 1;
            idx += 2;
            if depth == 0 {
                let inner = &s[start + 2..idx - 2];
                return Some((idx, inner.to_string()));
            }
            continue;
        }
        idx += 1;
    }

    None
}

fn split_template_params(template_inner: &str) -> Vec<String> {
    // template_inner includes: "Game data/saves|Windows|...|..."
    // We want params after name; split on | but ignore nested templates.
    let mut out = vec![];

    let mut depth: i32 = 0;
    let bytes = template_inner.as_bytes();
    let mut start = 0usize;
    let mut i = 0usize;

    while i < bytes.len() {
        if i + 1 < bytes.len() && bytes[i] == b'{' && bytes[i + 1] == b'{' {
            depth += 1;
            i += 2;
            continue;
        }
        if i + 1 < bytes.len() && bytes[i] == b'}' && bytes[i + 1] == b'}' {
            depth -= 1;
            i += 2;
            continue;
        }
        if bytes[i] == b'|' && depth == 0 {
            out.push(template_inner[start..i].to_string());
            start = i + 1;
        }
        i += 1;
    }
    out.push(template_inner[start..].to_string());

    // Drop the template name itself (first element)
    if !out.is_empty() {
        out.remove(0);
    }

    out
}

fn expand_windows_path_tokens(raw: &str) -> Option<String> {
    // Expand a small subset of common PCGW tokens.
    // If no expansion happened, return None.
    let mut s = raw.to_string();

    let roaming = std::env::var("APPDATA").ok();
    let local = std::env::var("LOCALAPPDATA").ok();
    let userprofile = std::env::var("USERPROFILE").ok();

    let mut changed = false;

    let replacements: Vec<(&str, Option<String>)> = vec![
        ("{{p|appdata}}", roaming.clone()),
        ("{{p|localappdata}}", local.clone()),
        ("{{p|userprofile}}", userprofile.clone()),
        (
            "{{p|savedgames}}",
            userprofile.as_ref().map(|u| format!("{}\\Saved Games", u)),
        ),
    ];

    for (token, value) in replacements {
        if let Some(v) = value {
            if s.contains(token) {
                s = s.replace(token, &v);
                changed = true;
            }
        }
    }

    // Normalize slashes a bit (PCGW often uses /)
    if s.contains('/') {
        s = s.replace('/', "\\");
        changed = true;
    }

    if changed {
        Some(s)
    } else {
        None
    }
}
