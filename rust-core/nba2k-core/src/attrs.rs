//! A build's attribute ratings.
//!
//! Keyed by the attribute ids the active year's dataset declares rather than
//! by struct fields: the attribute list is per-year data, and 2K has moved it
//! before. A named-field struct would need a code change and a migration every
//! time an attribute is added or renamed.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// Attribute ratings for one build. Missing keys read as 0, which is how the
/// web client has always treated a half-filled build form.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Attrs(BTreeMap<String, i32>);

impl Attrs {
    pub fn new() -> Self {
        Self(BTreeMap::new())
    }

    /// A rating, or 0 when the build has not set it.
    pub fn get(&self, key: &str) -> i32 {
        self.0.get(key).copied().unwrap_or(0)
    }

    pub fn set(&mut self, key: impl Into<String>, value: i32) -> &mut Self {
        self.0.insert(key.into(), value);
        self
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, i32)> {
        self.0.iter().map(|(k, v)| (k.as_str(), *v))
    }

    /// Every listed key at the same rating. Mainly for exercising the extremes
    /// of badge evaluation.
    pub fn uniform<'a>(keys: impl IntoIterator<Item = &'a str>, value: i32) -> Self {
        Self(keys.into_iter().map(|k| (k.to_string(), value)).collect())
    }
}

impl<K: Into<String>> FromIterator<(K, i32)> for Attrs {
    fn from_iter<T: IntoIterator<Item = (K, i32)>>(iter: T) -> Self {
        Self(iter.into_iter().map(|(k, v)| (k.into(), v)).collect())
    }
}
