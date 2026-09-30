//! Build analysis, badge evaluation, and season math for 2KBigRedFlowers.
//!
//! This is the first slice of the move to a native core. It holds the pure
//! logic -- no storage, no UI, no clock, no network -- which is both the part
//! most worth sharing between clients and the part that can be tested to
//! exhaustion. Records stay on the device; nothing here talks to a server.
//!
//! # Layout
//!
//! - [`gamedata`] -- per-year datasets, deserialized from JSON generated out of
//!   the JS datasets so the two stacks cannot drift.
//! - [`attrs`] -- a build's attribute ratings, keyed by dataset attribute id.
//! - [`badges`] -- tier evaluation and auto-unlock.
//! - [`ovr`] -- position-weighted overall estimate.
//! - [`seasons`] -- date to season, with an explicit stale answer.
//!
//! # Example
//!
//! ```
//! use nba2k_core::{attrs::Attrs, badges, gamedata, ovr};
//!
//! let data = gamedata::load("2k27").expect("2k27 is embedded");
//! let attrs = Attrs::from_iter([("drivingDunk", 99), ("vertical", 95)]);
//!
//! // Posterizer has published Gold and HOF thresholds in 2K27.
//! assert_eq!(
//!     badges::badge_tier(&data, &attrs, "posterizer"),
//!     Some(gamedata::Tier::Hof),
//! );
//!
//! // A badge whose thresholds 2K has not published never auto-unlocks,
//! // however high the ratings are.
//! assert_eq!(badges::badge_tier(&data, &attrs, "ghostStepper"), None);
//!
//! assert!(ovr::estimate(&data, &attrs, "C").is_some());
//! ```

pub mod attrs;
pub mod badges;
pub mod gamedata;
pub mod ovr;
pub mod seasons;

pub use attrs::Attrs;
pub use gamedata::{GameData, Tier};
