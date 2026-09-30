//! Game-year datasets.
//!
//! Everything that changes when 2K ships a new game lives in data, not code:
//! the badge catalog and its tier thresholds, the attribute list, position
//! weights, and the season calendar.
//!
//! The JSON is generated from the JS datasets by `scripts/export-gamedata.cjs`
//! and checked by `scripts/gamedata-export-guard.cjs`, so both stacks read the
//! same numbers for as long as the web client exists. Adding next year's game
//! is one line in `EMBEDDED` plus the exported file.

use std::collections::BTreeMap;

use serde::Deserialize;

/// Datasets compiled into the binary. A client on a phone should not have to
/// find a file on disk to know what a badge requires.
const EMBEDDED: &[(&str, &str)] = &[
    ("2k26", include_str!("../../../game-data/2k26.json")),
    ("2k27", include_str!("../../../game-data/2k27.json")),
];

/// One attribute requirement: `k` must be at least `val`.
#[derive(Debug, Clone, Deserialize)]
pub struct Req {
    pub k: String,
    pub val: i32,
}

/// A requirement group. `all` needs every entry; `any` needs one.
///
/// Untagged because the JS builders emit `{"all": [...]}` or `{"any": [...]}`
/// rather than a discriminated shape.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ReqGroup {
    All { all: Vec<Req> },
    Any { any: Vec<Req> },
}

/// Badge tiers, ordered weakest to strongest.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Tier {
    Bronze,
    Silver,
    Gold,
    Hof,
    Legend,
}

impl Tier {
    /// Strongest first -- the order `badges::auto_badges` walks, so the highest
    /// tier a build satisfies is the one reported.
    pub const DESCENDING: [Tier; 5] = [
        Tier::Legend,
        Tier::Hof,
        Tier::Gold,
        Tier::Silver,
        Tier::Bronze,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Tier::Bronze => "bronze",
            Tier::Silver => "silver",
            Tier::Gold => "gold",
            Tier::Hof => "hof",
            Tier::Legend => "legend",
        }
    }
}

/// Requirements per tier.
///
/// `None` means "2K has not published this tier's requirements", which is not
/// the same as "no requirement" -- see the `badges` module. In 2K27 every
/// `legend` is `None` by design, because Legend comes from Synergy and season
/// progression rather than from attributes.
#[derive(Debug, Clone, Deserialize)]
pub struct Tiers {
    pub bronze: Option<Vec<ReqGroup>>,
    pub silver: Option<Vec<ReqGroup>>,
    pub gold: Option<Vec<ReqGroup>>,
    pub hof: Option<Vec<ReqGroup>>,
    pub legend: Option<Vec<ReqGroup>>,
}

impl Tiers {
    /// Requirements for a tier, or `None` when the tier is unknown.
    pub fn get(&self, tier: Tier) -> Option<&Vec<ReqGroup>> {
        match tier {
            Tier::Bronze => self.bronze.as_ref(),
            Tier::Silver => self.silver.as_ref(),
            Tier::Gold => self.gold.as_ref(),
            Tier::Hof => self.hof.as_ref(),
            Tier::Legend => self.legend.as_ref(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct BadgeThreshold {
    /// Height range the badge is available to, as published. `None` when
    /// unknown, `Some("All")` when unrestricted.
    pub height: Option<String>,
    pub tiers: Tiers,
}

/// How much the dataset can be trusted about a badge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    /// Name and discipline both corroborated by a listed source.
    Confirmed,
    /// Carried over from the previous game because no source confirms it was
    /// cut. May no longer exist.
    Provisional,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Badge {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub desc: String,
    /// Absent in complete datasets, where every entry is a shipped badge.
    #[serde(default)]
    pub confidence: Option<Confidence>,
    #[serde(rename = "isNew", default)]
    pub is_new: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BadgeCategory {
    pub id: String,
    pub label: String,
    pub badges: Vec<Badge>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AttrGroup {
    pub label: String,
    #[serde(rename = "zhLabel")]
    pub zh_label: String,
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Season {
    pub n: u32,
    pub label: String,
    pub name: String,
    pub zh: String,
    /// Inclusive `YYYY-MM-DD` bounds. Lexicographic comparison is date
    /// comparison in this format, which is why no date library is needed.
    pub from: String,
    pub to: String,
    /// Projected from the six-week cadence rather than published by 2K.
    #[serde(default)]
    pub estimated: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Meta {
    pub complete: bool,
    #[serde(rename = "badgeCountOfficial")]
    pub badge_count_official: usize,
    #[serde(rename = "legendViaSynergy", default)]
    pub legend_via_synergy: bool,
    #[serde(default)]
    pub notes: Vec<String>,
    #[serde(default)]
    pub sources: Vec<String>,
    /// Badges confirmed to exist whose discipline is not published yet, so they
    /// are recorded here instead of being filed under a guess.
    #[serde(rename = "pendingBadges", default)]
    pub pending_badges: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GameData {
    pub year: String,
    pub label: String,
    pub meta: Meta,
    #[serde(rename = "attrGroups")]
    pub attr_groups: BTreeMap<String, AttrGroup>,
    #[serde(rename = "attrLabels")]
    pub attr_labels: BTreeMap<String, Vec<String>>,
    #[serde(rename = "positionWeights")]
    pub position_weights: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(rename = "badgeCategories")]
    pub badge_categories: Vec<BadgeCategory>,
    #[serde(rename = "badgeThresholds")]
    pub badge_thresholds: BTreeMap<String, BadgeThreshold>,
    pub seasons: Vec<Season>,
}

impl GameData {
    /// Every attribute key the year's groups declare.
    pub fn attr_keys(&self) -> Vec<&str> {
        self.attr_groups
            .values()
            .flat_map(|g| g.keys.iter().map(String::as_str))
            .collect()
    }

    /// Every badge in the catalog, across categories.
    pub fn badges(&self) -> impl Iterator<Item = &Badge> {
        self.badge_categories.iter().flat_map(|c| c.badges.iter())
    }

    /// Look up a badge's catalog entry.
    pub fn badge(&self, id: &str) -> Option<&Badge> {
        self.badges().find(|b| b.id == id)
    }
}

/// The registered game years, newest first.
pub fn years() -> Vec<&'static str> {
    let mut years: Vec<&'static str> = EMBEDDED.iter().map(|(y, _)| *y).collect();
    years.sort_unstable();
    years.reverse();
    years
}

/// Parse one year's dataset.
///
/// `None` for a year that was never embedded. A malformed embedded dataset is a
/// build-time mistake rather than a runtime condition, so it panics with the
/// parse error instead of being silently skipped.
pub fn load(year: &str) -> Option<GameData> {
    let (_, raw) = EMBEDDED.iter().find(|(y, _)| *y == year)?;
    Some(
        serde_json::from_str(raw)
            .unwrap_or_else(|e| panic!("embedded {year} dataset is malformed: {e}")),
    )
}

/// The newest registered year -- what a client shows unless the user pins an
/// older one.
pub fn load_latest() -> GameData {
    let year = years()
        .first()
        .copied()
        .expect("at least one dataset must be embedded");
    load(year).expect("the newest listed year must be loadable")
}
