//! Badge tier evaluation.
//!
//! The one invariant this module exists to protect: a tier whose requirements
//! are not published must never be reported as unlocked. The JS implementation
//! got this wrong -- it treated an empty requirement list as satisfied, so
//! every badge with unknown thresholds evaluated straight to Legend and the app
//! told users they had badges that do not exist. Here the distinction is in the
//! type: `Option<Vec<ReqGroup>>`, where `None` is "unknown" and an empty `Vec`
//! is still not a met tier.

use std::collections::BTreeMap;

use crate::attrs::Attrs;
use crate::gamedata::{GameData, Req, ReqGroup, Tier};

fn meets_req(attrs: &Attrs, req: &Req) -> bool {
    attrs.get(&req.k) >= req.val
}

fn meets_group(attrs: &Attrs, group: &ReqGroup) -> bool {
    match group {
        // An `all` group with no entries states no requirement, which cannot
        // be evidence that a tier is earned.
        ReqGroup::All { all } => !all.is_empty() && all.iter().all(|r| meets_req(attrs, r)),
        ReqGroup::Any { any } => any.iter().any(|r| meets_req(attrs, r)),
    }
}

/// Whether `attrs` satisfies a tier's requirements.
///
/// `None` (unpublished) and an empty group list are both unmet: absence of a
/// stated requirement is not a satisfied requirement.
pub fn meets_tier(attrs: &Attrs, groups: Option<&Vec<ReqGroup>>) -> bool {
    match groups {
        None => false,
        Some(groups) if groups.is_empty() => false,
        Some(groups) => groups.iter().all(|g| meets_group(attrs, g)),
    }
}

/// The highest tier `attrs` earns for one badge, or `None` if it earns none or
/// the badge has no published thresholds at all.
pub fn badge_tier(data: &GameData, attrs: &Attrs, badge_id: &str) -> Option<Tier> {
    let threshold = data.badge_thresholds.get(badge_id)?;
    Tier::DESCENDING
        .into_iter()
        .find(|&tier| meets_tier(attrs, threshold.tiers.get(tier)))
}

/// Every badge `attrs` earns, at its highest satisfied tier.
///
/// Badges with no published thresholds are absent rather than present at some
/// default, so a caller cannot mistake "unknown" for "not earned yet".
pub fn auto_badges(data: &GameData, attrs: &Attrs) -> BTreeMap<String, Tier> {
    if attrs.is_empty() {
        return BTreeMap::new();
    }
    data.badge_thresholds
        .keys()
        .filter_map(|id| badge_tier(data, attrs, id).map(|tier| (id.clone(), tier)))
        .collect()
}

/// Badge tiers the user set by hand, merged over what the attributes earn.
///
/// A manual entry always wins: the user may know something the dataset does
/// not, which is the whole point of letting them edit it.
pub fn merge_badges(
    data: &GameData,
    attrs: &Attrs,
    manual: &BTreeMap<String, Tier>,
) -> BTreeMap<String, Tier> {
    let mut merged = auto_badges(data, attrs);
    for (id, tier) in manual {
        merged.insert(id.clone(), *tier);
    }
    merged
}

/// How far one attribute is from reaching a tier, for the nearest requirement.
///
/// `None` when the tier is unpublished -- there is nothing honest to show.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TierGap {
    pub attr: String,
    pub current: i32,
    pub target: i32,
    pub gap: i32,
}

/// The smallest single-attribute gap to a tier, or `None` if the tier is
/// unknown or already met.
pub fn tier_gap(data: &GameData, attrs: &Attrs, badge_id: &str, tier: Tier) -> Option<TierGap> {
    let threshold = data.badge_thresholds.get(badge_id)?;
    let groups = threshold.tiers.get(tier)?;
    if groups.is_empty() {
        return None;
    }

    groups
        .iter()
        .flat_map(|group| match group {
            ReqGroup::All { all } => all.iter(),
            ReqGroup::Any { any } => any.iter(),
        })
        .map(|req| {
            let current = attrs.get(&req.k);
            TierGap {
                attr: req.k.clone(),
                current,
                target: req.val,
                gap: (req.val - current).max(0),
            }
        })
        .min_by_key(|row| row.gap)
        .filter(|row| row.gap > 0)
}
