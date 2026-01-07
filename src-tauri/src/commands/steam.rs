use serde::{Deserialize, Serialize};
use std::time::Duration;

const STEAM_STORE_SEARCH_API: &str = "https://store.steampowered.com/api/storesearch/";

#[derive(Debug, Clone, Serialize)]
pub struct SteamSearchResult {
    pub id: u32,
    pub name: String,
    pub cover_url: Option<String>,
    pub price: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SteamStoreResponse {
    items: Vec<SteamStoreItem>,
    total: u32,
}

#[derive(Debug, Deserialize)]
struct SteamStoreItem {
    id: u32,
    name: String,
    tiny_image: Option<String>, // Usually the header image or capsule
    price: Option<SteamPrice>,
}

#[derive(Debug, Deserialize)]
struct SteamPrice {
    currency: String,
    initial: u32,
    #[serde(rename = "final")]
    final_price: u32,
}

#[tauri::command]
pub async fn steam_search_games(query: String) -> Result<Vec<SteamSearchResult>, String> {
    println!("Steam search called with query: '{}'", query);
    let query = query.trim();
    if query.is_empty() {
        return Ok(vec![]);
    }

    let client = reqwest::Client::builder()
        .user_agent("sync-saves/0.1 (Steam lookup)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let resp = client
        .get(STEAM_STORE_SEARCH_API)
        .query(&[
            ("term", query),
            ("l", "english"),
            ("cc", "US"),
        ])
        .send()
        .await
        .map_err(|e| format!("Steam request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Steam returned HTTP {}", resp.status()));
    }

    let json: SteamStoreResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Steam response: {e}"))?;

    let results: Vec<SteamSearchResult> = json.items.into_iter().map(|item| {
        let cover_url = Some(format!("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{}/library_600x900.jpg", item.id));

        SteamSearchResult {
            id: item.id,
            name: item.name,
            cover_url, 
            price: item.price.map(|p| format!("{} {}", p.final_price / 100, p.currency)),
        }
    }).collect();

    println!("Steam search found {} items", results.len());
    Ok(results)
}
