//! The invariants `scripts/gamedata-guard.cjs` pins on the JS side, restated
//! here so the two implementations are held to the same behaviour during the
//! migration. If one of these ever passes in JS and fails here, the clients
//! disagree about what a build has earned.

use nba2k_core::attrs::Attrs;
use nba2k_core::gamedata::{self, Confidence, GameData, Tier};
use nba2k_core::{badges, ovr, seasons};

fn maxed(data: &GameData) -> Attrs {
    Attrs::uniform(data.attr_keys(), 99)
}

// ----------------------------------------------------------------- registry

#[test]
fn registry_lists_years_newest_first() {
    assert_eq!(gamedata::years(), vec!["2k27", "2k26"]);
}

#[test]
fn newest_year_is_the_default() {
    assert_eq!(gamedata::load_latest().year, "2k27");
}

#[test]
fn unknown_year_is_absent_rather_than_a_panic() {
    assert!(gamedata::load("2k99").is_none());
}

#[test]
fn every_year_parses_and_is_internally_consistent() {
    for year in gamedata::years() {
        let data = gamedata::load(year).expect("listed year must load");
        assert_eq!(data.year, year);

        let keys = data.attr_keys();
        assert!(!keys.is_empty(), "{year}: no attributes");

        for key in &keys {
            assert!(
                data.attr_labels.contains_key(*key),
                "{year}: attribute {key} has no label",
            );
        }

        for (position, weights) in &data.position_weights {
            for key in &keys {
                assert!(
                    weights.contains_key(*key),
                    "{year}: {position} weights omit {key}",
                );
            }
        }

        // Thresholds may be sparse, but they may not invent badges.
        for id in data.badge_thresholds.keys() {
            assert!(
                data.badge(id).is_some(),
                "{year}: threshold {id} is not in the catalog",
            );
        }
    }
}

// ------------------------------------------------- unknown tiers stay locked

#[test]
fn an_unknown_or_empty_tier_is_never_met() {
    let attrs = Attrs::from_iter([("drivingDunk", 99)]);
    assert!(!badges::meets_tier(&attrs, None));
    assert!(!badges::meets_tier(&attrs, Some(&Vec::new())));
}

/// The regression this module exists for: the JS implementation treated an
/// empty requirement list as satisfied, so a badge with unpublished thresholds
/// evaluated straight to Legend.
#[test]
fn maxed_build_unlocks_no_badge_without_published_thresholds() {
    let data = gamedata::load("2k27").unwrap();
    let unlocked = badges::auto_badges(&data, &maxed(&data));

    for id in unlocked.keys() {
        assert!(
            data.badge_thresholds.contains_key(id),
            "2k27: {id} unlocked with no threshold entry at all",
        );
    }

    for (id, tier) in &unlocked {
        let tiers = &data.badge_thresholds[id].tiers;
        assert!(
            tiers.get(*tier).is_some_and(|groups| !groups.is_empty()),
            "2k27: {id} reported {} from an unpublished tier",
            tier.id(),
        );
    }
}

#[test]
fn legend_is_not_attribute_gated_in_2k27() {
    let data = gamedata::load("2k27").unwrap();
    assert!(data.meta.legend_via_synergy);

    for (id, threshold) in &data.badge_thresholds {
        assert!(
            threshold.tiers.legend.is_none(),
            "2k27: {id} has attribute requirements for a tier Synergy grants",
        );
    }

    assert!(
        !badges::auto_badges(&data, &maxed(&data))
            .values()
            .any(|t| *t == Tier::Legend),
        "2k27: no build should reach Legend from attributes alone",
    );
}

#[test]
fn published_2k27_thresholds_evaluate_as_documented() {
    let data = gamedata::load("2k27").unwrap();

    // Gold Posterizer is 93 Driving Dunk and 80 Vertical; HOF is 99 and 90.
    let gold = Attrs::from_iter([("drivingDunk", 93), ("vertical", 80)]);
    assert_eq!(
        badges::badge_tier(&data, &gold, "posterizer"),
        Some(Tier::Gold)
    );

    let hof = Attrs::from_iter([("drivingDunk", 99), ("vertical", 90)]);
    assert_eq!(
        badges::badge_tier(&data, &hof, "posterizer"),
        Some(Tier::Hof)
    );

    // One point short of Gold on either attribute earns nothing: Bronze and
    // Silver are unpublished, so there is no lower tier to fall back to.
    let short = Attrs::from_iter([("drivingDunk", 92), ("vertical", 99)]);
    assert_eq!(badges::badge_tier(&data, &short, "posterizer"), None);

    // Quick Trigger's HOF is an `any` group: 99 Mid-Range OR 99 Three-Point.
    let mid_only = Attrs::from_iter([("midRange", 99)]);
    assert_eq!(
        badges::badge_tier(&data, &mid_only, "quickTrigger"),
        Some(Tier::Hof)
    );
    let three_only = Attrs::from_iter([("threePoint", 99)]);
    assert_eq!(
        badges::badge_tier(&data, &three_only, "quickTrigger"),
        Some(Tier::Hof)
    );
    let neither = Attrs::from_iter([("midRange", 98), ("threePoint", 98)]);
    assert_eq!(badges::badge_tier(&data, &neither, "quickTrigger"), None);
}

#[test]
fn a_manual_tier_overrides_what_attributes_earn() {
    let data = gamedata::load("2k27").unwrap();
    let attrs = Attrs::from_iter([("drivingDunk", 99), ("vertical", 90)]);
    let manual = [("posterizer".to_string(), Tier::Bronze)]
        .into_iter()
        .collect();

    let merged = badges::merge_badges(&data, &attrs, &manual);
    assert_eq!(merged["posterizer"], Tier::Bronze);
}

#[test]
fn an_empty_build_earns_nothing() {
    let data = gamedata::load("2k27").unwrap();
    assert!(badges::auto_badges(&data, &Attrs::new()).is_empty());
}

// ------------------------------------------------------------- 2k26 intact

#[test]
fn the_2k26_catalog_still_holds_every_shipped_badge() {
    let data = gamedata::load("2k26").unwrap();
    assert!(data.meta.complete);
    assert_eq!(data.badges().count(), data.meta.badge_count_official);
    assert_eq!(data.badge_categories.len(), 5);
    assert!(
        data.badges().all(|b| b.confidence.is_none()),
        "a finished game's catalog needs no confidence flags",
    );
}

#[test]
fn every_2k26_badge_reaches_legend_at_99() {
    let data = gamedata::load("2k26").unwrap();
    let unlocked = badges::auto_badges(&data, &maxed(&data));

    assert_eq!(unlocked.len(), data.badge_thresholds.len());
    for (id, tier) in &unlocked {
        assert_eq!(*tier, Tier::Legend, "2k26: {id} stopped below Legend");
    }
}

#[test]
fn the_2k27_catalog_is_flagged_incomplete_and_tagged_per_badge() {
    let data = gamedata::load("2k27").unwrap();
    assert!(!data.meta.complete);

    let ids: Vec<&str> = data
        .badge_categories
        .iter()
        .map(|c| c.id.as_str())
        .collect();
    assert_eq!(
        ids,
        [
            "finishing",
            "shooting",
            "playmaking",
            "defense",
            "rebounding",
            "physicals"
        ],
        "2k27 splits rebounding and physicals into separate disciplines",
    );

    assert!(
        data.badges().all(|b| b.confidence.is_some()),
        "every 2k27 badge must carry a confidence level",
    );
    assert!(
        data.badges().count() <= data.meta.badge_count_official,
        "the dataset must not encode more badges than the game ships",
    );
    assert!(
        data.badges()
            .any(|b| b.confidence == Some(Confidence::Provisional)),
        "entries carried over from 2k26 should be marked, not presented as confirmed",
    );
    assert!(!data.meta.pending_badges.is_empty());
}

// ---------------------------------------------------------------- seasons

#[test]
fn season_bounds_are_ordered_and_non_overlapping() {
    for year in gamedata::years() {
        let data = gamedata::load(year).unwrap();
        for pair in data.seasons.windows(2) {
            let (prev, next) = (&pair[0], &pair[1]);
            assert!(
                prev.from < prev.to,
                "{year}: S{} ends before it starts",
                prev.n
            );
            assert!(
                next.from > prev.to,
                "{year}: S{} starts before S{} ends",
                next.n,
                prev.n,
            );
        }
    }
}

#[test]
fn the_2k26_season_table_maps_its_own_dates() {
    let data = gamedata::load("2k26").unwrap();
    assert_eq!(seasons::season_number(&data, "2025-09-05"), Some(1));
    assert_eq!(seasons::season_number(&data, "2025-12-01"), Some(3));
    assert_eq!(seasons::season_number(&data, "2026-08-06"), Some(8));
    assert!(!seasons::has_estimated_bounds(&data));
}

/// The bug: with the 2K26 table ending 2026-08-06, every later date reported
/// the finished Season 8 as current with nothing marking it.
#[test]
fn a_date_past_the_last_season_is_reported_as_stale() {
    let data = gamedata::load("2k26").unwrap();
    assert_eq!(seasons::season_number(&data, "2026-09-14"), None);

    let resolved = seasons::resolve(&data, "2026-09-14");
    assert!(resolved.is_stale());
    assert_eq!(resolved.season().map(|s| s.n), Some(8));
}

#[test]
fn a_date_before_the_first_season_is_reported_too() {
    let data = gamedata::load("2k26").unwrap();
    let resolved = seasons::resolve(&data, "2024-01-01");
    assert!(resolved.is_stale());
    assert_eq!(resolved.season().map(|s| s.n), Some(1));
}

#[test]
fn the_2k27_table_starts_on_the_confirmed_date_and_is_marked_estimated() {
    let data = gamedata::load("2k27").unwrap();
    assert_eq!(
        data.seasons.first().map(|s| s.from.as_str()),
        Some("2026-08-26")
    );
    assert_eq!(seasons::season_number(&data, "2026-08-26"), Some(1));
    assert!(
        data.seasons.iter().all(|s| s.estimated),
        "no 2k27 season end date is published, so every bound is a projection",
    );
    assert!(seasons::has_estimated_bounds(&data));
}

#[test]
fn an_empty_date_matches_nothing() {
    let data = gamedata::load("2k27").unwrap();
    assert_eq!(seasons::season_number(&data, ""), None);
}

// -------------------------------------------------------------------- ovr

#[test]
fn ovr_is_absent_rather_than_zero_for_an_empty_build() {
    let data = gamedata::load("2k27").unwrap();
    assert_eq!(ovr::estimate(&data, &Attrs::new(), "PG"), None);
}

#[test]
fn ovr_rejects_a_position_the_dataset_does_not_define() {
    let data = gamedata::load("2k27").unwrap();
    assert_eq!(ovr::estimate(&data, &maxed(&data), "SixthMan"), None);
}

#[test]
fn ovr_is_clamped_to_the_range_a_build_can_occupy() {
    let data = gamedata::load("2k27").unwrap();

    // A 0 means the user has not entered that attribute, so a build of nothing
    // but zeros has no ratings to weight.
    let unset = Attrs::uniform(data.attr_keys(), 0);
    assert_eq!(ovr::estimate(&data, &unset, "PG"), None);

    // Below the form's floor the rating clamps up to MIN_RATING rather than
    // dragging the estimate under what a real build can be.
    let below_floor = Attrs::uniform(data.attr_keys(), 1);
    assert_eq!(ovr::estimate(&data, &below_floor, "PG"), Some(ovr::MIN_OVR));

    let low = Attrs::uniform(data.attr_keys(), 25);
    assert_eq!(ovr::estimate(&data, &low, "PG"), Some(ovr::MIN_OVR));

    let high = maxed(&data);
    assert_eq!(ovr::estimate(&data, &high, "PG"), Some(ovr::MAX_OVR));
}

#[test]
fn position_weighting_actually_discriminates() {
    let data = gamedata::load("2k27").unwrap();
    // A perimeter-only build should read better at guard than at centre.
    let guard = Attrs::from_iter([
        ("threePoint", 95),
        ("ballHandle", 92),
        ("passAccuracy", 90),
        ("speedWithBall", 90),
        ("perimeterDefense", 80),
    ]);
    let pg = ovr::estimate(&data, &guard, "PG").unwrap();
    let c = ovr::estimate(&data, &guard, "C").unwrap();
    assert!(pg > c, "PG {pg} should outrank C {c} for a perimeter build");

    let (best, _) = ovr::best_position(&data, &guard).unwrap();
    assert!(best == "PG" || best == "SG", "expected a guard, got {best}");
}

#[test]
fn tier_gap_points_at_the_nearest_requirement() {
    let data = gamedata::load("2k27").unwrap();
    let attrs = Attrs::from_iter([("drivingDunk", 90), ("vertical", 79)]);

    let gap = badges::tier_gap(&data, &attrs, "posterizer", Tier::Gold).unwrap();
    assert_eq!(gap.attr, "vertical");
    assert_eq!(gap.gap, 1);

    // No gap to report for a tier nobody published.
    assert!(badges::tier_gap(&data, &attrs, "posterizer", Tier::Bronze).is_none());
    assert!(badges::tier_gap(&data, &attrs, "ghostStepper", Tier::Gold).is_none());
}
