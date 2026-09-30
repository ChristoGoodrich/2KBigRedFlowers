//! Position-weighted overall rating estimate.
//!
//! An estimate, not 2K's own OVR formula, which is not published. Weights come
//! from the active year's dataset; for 2K27 they are carried over from 2K26 and
//! flagged unverified there, so treat the number as directional.

use crate::attrs::Attrs;
use crate::gamedata::GameData;

/// Ratings are clamped to this range, matching the web client's build form.
pub const MIN_RATING: i32 = 25;
pub const MAX_RATING: i32 = 99;
/// The estimate is clamped to the range a real build can occupy.
pub const MIN_OVR: i32 = 40;
pub const MAX_OVR: i32 = 99;

/// Weighted estimate for a position, or `None` when the position is not in the
/// dataset or the build has no ratings for any weighted attribute.
///
/// Returning `None` rather than a number is deliberate: a zero here would be
/// rendered as a real 40-rated build.
pub fn estimate(data: &GameData, attrs: &Attrs, position: &str) -> Option<i32> {
    let weights = data.position_weights.get(position)?;

    let mut weighted = 0.0_f64;
    let mut total = 0.0_f64;
    for (key, weight) in weights {
        let rating = attrs.get(key);
        if rating <= 0 {
            continue;
        }
        let rating = rating.clamp(MIN_RATING, MAX_RATING) as f64;
        weighted += rating * weight;
        total += weight;
    }

    if total <= 0.0 {
        return None;
    }
    Some((weighted / total).round() as i32).map(|v| v.clamp(MIN_OVR, MAX_OVR))
}

/// The position whose weighting flatters the build most, with its estimate.
///
/// Useful for "what is this build actually good at" rather than trusting the
/// position the user typed.
pub fn best_position(data: &GameData, attrs: &Attrs) -> Option<(String, i32)> {
    data.position_weights
        .keys()
        .filter_map(|pos| estimate(data, attrs, pos).map(|ovr| (pos.clone(), ovr)))
        // Ties go to the first position in dataset order so the result is
        // stable across runs.
        .max_by_key(|(_, ovr)| *ovr)
}
