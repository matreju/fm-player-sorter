//! Managed UI contexts must prove their class identity before their job state is used.
//! An arbitrary pointer/1/2 pattern elsewhere in memory is not a manager context.

pub(crate) fn context_layout_index(name: &str, namespace: &str) -> Option<usize> {
    match (namespace, name) {
        ("", "GameWorldTabsAndBookmarksModule") => Some(0),
        ("FM.UI", "IGEModule") => Some(1),
        ("FM.UI", "TileSearchPanel") => Some(2),
        _ => None,
    }
}

pub(crate) fn context_matches(
    name: &str, namespace: &str, layouts: &[(usize, usize); 3],
    mut read_pointer: impl FnMut(usize) -> Option<usize>,
    mut read_state: impl FnMut(usize) -> Option<u32>,
    binding: usize, state: u32,
) -> bool {
    let Some(index) = context_layout_index(name, namespace) else { return false; };
    let (binding_offset, state_offset) = layouts[index];
    read_pointer(binding_offset) == Some(binding) && read_state(state_offset) == Some(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    const FM27: [(usize,usize);3] = [(0x308,0x370),(0xB0,0x94),(0x398,0x3C0)];
    #[test]
    fn unrelated_objects_cannot_vote_for_a_job_even_when_offsets_match() {
        assert!(!context_matches("OtherPanel","FM.UI",&FM27, |_|Some(100), |_|Some(2),100,2));
        assert!(!context_matches("IGEModule","Wrong.Namespace",&FM27, |_|Some(100), |_|Some(2),100,2));
    }
    #[test]
    fn each_context_uses_only_its_own_fields() {
        assert!(context_matches("IGEModule","FM.UI",&FM27, |offset|(offset==0xB0).then_some(100), |offset|(offset==0x94).then_some(1),100,1));
        // Previously a different layout could interpret an unrelated integer as ClubManager.
        assert!(!context_matches("IGEModule","FM.UI",&FM27, |offset|(offset==0x308).then_some(100), |offset|(offset==0x370).then_some(2),100,2));
        assert!(!context_matches("IGEModule","FM.UI",&FM27, |_|Some(100), |_|Some(2),100,1));
        assert!(!context_matches("IGEModule","FM.UI",&FM27, |_|None, |_|Some(1),100,1));
    }
}
