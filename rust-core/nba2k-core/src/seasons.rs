//! Season lookup.
//!
//! Dates are `YYYY-MM-DD`, where lexicographic order is chronological order,
//! so this needs no date library and no timezone handling. The caller decides
//! what "today" means and passes it in -- a core that reads the clock itself
//! cannot be tested for the boundary cases that actually broke before.

use crate::gamedata::{GameData, Season};

/// Which season a date falls in, and whether that answer is trustworthy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeasonMatch<'a> {
    /// The date is inside a listed season.
    Exact(&'a Season),
    /// The date is past the last listed season. The table needs updating; the
    /// nearest season is offered so the UI has something to show, but it must
    /// say so rather than presenting a finished season as current.
    Stale(&'a Season),
    /// The date is before the first listed season -- a record from an earlier
    /// game, most likely.
    BeforeFirst(&'a Season),
    /// The dataset lists no seasons.
    Unknown,
}

impl<'a> SeasonMatch<'a> {
    /// The season to display, whether or not the answer is exact.
    pub fn season(&self) -> Option<&'a Season> {
        match self {
            SeasonMatch::Exact(s) | SeasonMatch::Stale(s) | SeasonMatch::BeforeFirst(s) => Some(s),
            SeasonMatch::Unknown => None,
        }
    }

    /// True when the answer is an extrapolation the UI should qualify.
    pub fn is_stale(&self) -> bool {
        matches!(self, SeasonMatch::Stale(_) | SeasonMatch::BeforeFirst(_))
    }
}

/// The season number for a date, or `None` when it falls outside the table.
///
/// Deliberately strict: a game logged after the last listed season belongs to
/// no known season, and saying so is better than filing it under a finished
/// one. Use [`resolve`] when the UI needs something to render anyway.
pub fn season_number(data: &GameData, date: &str) -> Option<u32> {
    if date.is_empty() {
        return None;
    }
    data.seasons
        .iter()
        .find(|s| date >= s.from.as_str() && date <= s.to.as_str())
        .map(|s| s.n)
}

/// Resolve a date against the season table, reporting how confident the answer
/// is.
///
/// The bug this replaces: the previous implementation fell back to the last
/// season with no marker, so once the 2K26 table ran out on 2026-08-06 every
/// later date silently reported the finished Season 8 as current.
pub fn resolve<'a>(data: &'a GameData, date: &str) -> SeasonMatch<'a> {
    let Some(first) = data.seasons.first() else {
        return SeasonMatch::Unknown;
    };
    let last = data.seasons.last().unwrap_or(first);

    if let Some(exact) = data
        .seasons
        .iter()
        .find(|s| date >= s.from.as_str() && date <= s.to.as_str())
    {
        return SeasonMatch::Exact(exact);
    }
    if date > last.to.as_str() {
        return SeasonMatch::Stale(last);
    }
    if date < first.from.as_str() {
        return SeasonMatch::BeforeFirst(first);
    }
    // Between two listed seasons: a gap in the table rather than an overrun.
    SeasonMatch::Stale(last)
}

/// Whether any of the year's season bounds are projected rather than published.
pub fn has_estimated_bounds(data: &GameData) -> bool {
    data.seasons.iter().any(|s| s.estimated)
}
