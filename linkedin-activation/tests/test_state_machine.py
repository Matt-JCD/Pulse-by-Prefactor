from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.state_machine import VALID_TRANSITIONS, validate_transition, transition_status


# ---------------------------------------------------------------------------
# validate_transition
# ---------------------------------------------------------------------------

ALL_STATUSES = list(VALID_TRANSITIONS.keys()) + [
    "sent",
    "rejected",
]


class TestValidateTransition:
    """Every valid transition returns True; everything else returns False."""

    @pytest.mark.parametrize(
        "current, new",
        [
            (src, dst)
            for src, dsts in VALID_TRANSITIONS.items()
            for dst in dsts
        ],
    )
    def test_valid_transitions(self, current: str, new: str):
        assert validate_transition(current, new) is True

    @pytest.mark.parametrize(
        "current, new",
        [
            ("detected", "approved"),
            ("detected", "sent"),
            ("detected", "sending"),
            ("drafted", "sent"),
            ("awaiting_review", "send_queued"),
            ("approved", "sent"),
            ("sending", "drafted"),
            ("sent", "detected"),
            ("sent", "drafted"),
            ("rejected", "approved"),
        ],
    )
    def test_invalid_transitions(self, current: str, new: str):
        assert validate_transition(current, new) is False

    def test_unknown_status_returns_false(self):
        assert validate_transition("nonexistent", "drafted") is False


# ---------------------------------------------------------------------------
# transition_status
# ---------------------------------------------------------------------------

def _mock_supabase(current_status: str, updated_row: dict | None = None) -> MagicMock:
    """Build a mock supabase client that chains .table().select()... and .update()..."""
    client = MagicMock()

    # SELECT chain: .table(T).select("status").eq("id", ...).single().execute()
    select_response = MagicMock()
    select_response.data = {"status": current_status}

    select_chain = MagicMock()
    select_chain.eq.return_value = select_chain
    select_chain.single.return_value = select_chain
    select_chain.execute.return_value = select_response

    # UPDATE chain: .table(T).update({...}).eq("id", ...).execute()
    if updated_row is None:
        updated_row = {"id": "abc-123", "status": "drafted"}
    update_response = MagicMock()
    update_response.data = [updated_row]

    update_chain = MagicMock()
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = update_response

    def table_side_effect(name):
        """Return different chain depending on whether select or update is called."""
        chain = MagicMock()
        chain.select.return_value = select_chain
        chain.update.return_value = update_chain
        return chain

    client.table.side_effect = table_side_effect
    return client


class TestTransitionStatus:
    def test_valid_transition_updates_row(self):
        expected = {"id": "abc-123", "status": "drafted"}
        client = _mock_supabase("detected", expected)

        result = transition_status(client, "abc-123", "drafted")

        assert result == expected

    def test_invalid_transition_raises(self):
        client = _mock_supabase("detected")

        with pytest.raises(ValueError, match="Invalid transition"):
            transition_status(client, "abc-123", "sent")

    def test_raises_with_descriptive_message(self):
        client = _mock_supabase("sent")

        with pytest.raises(ValueError, match="'sent' -> 'detected'"):
            transition_status(client, "abc-123", "detected")
