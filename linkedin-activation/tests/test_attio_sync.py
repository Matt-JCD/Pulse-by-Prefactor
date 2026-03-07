from __future__ import annotations

from unittest.mock import patch, MagicMock, call

import pytest

from app.attio_sync import (
    parse_company_from_headline,
    sync_outreach_to_attio,
    sync_all_unsynced,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_ROW = {
    "id": "out-1",
    "full_name": "Jane Smith",
    "first_name": "Jane",
    "last_name": "Smith",
    "headline": "VP Engineering @ Acme Corp",
    "linkedin_profile_url": "https://linkedin.com/in/janesmith",
    "connection_since": "2026-03-01",
    "status": "sent",
    "attio_synced_at": None,
}


def _mock_httpx_response(record_id: str) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {"data": {"id": {"record_id": record_id}}}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# parse_company_from_headline
# ---------------------------------------------------------------------------

class TestParseCompanyFromHeadline:
    def test_at_sign(self):
        assert parse_company_from_headline("CTO @ Acme Inc") == "Acme Inc"

    def test_at_word(self):
        assert parse_company_from_headline("Engineer at Google") == "Google"

    def test_pipe_separator(self):
        assert parse_company_from_headline("Product Manager | Microsoft") == "Microsoft"

    def test_at_sign_no_space_after(self):
        assert parse_company_from_headline("CISO @Volkswagen") == "Volkswagen"

    def test_at_uppercase(self):
        assert parse_company_from_headline("VP AT JPMorgan") == "JPMorgan"

    def test_no_separator(self):
        assert parse_company_from_headline("Software Engineer") is None

    def test_empty_string(self):
        assert parse_company_from_headline("") is None

    def test_none(self):
        assert parse_company_from_headline(None) is None

    def test_takes_last_segment(self):
        assert parse_company_from_headline("VP @ Acme Corp") == "Acme Corp"

    def test_complex_headline(self):
        result = parse_company_from_headline("VP, Lead Cybersecurity Architect @ JPMorganChase")
        assert result == "JPMorganChase"


# ---------------------------------------------------------------------------
# Company upsert
# ---------------------------------------------------------------------------

class TestUpsertCompany:
    @patch("app.attio_sync.ATTIO_API_KEY", "test-key")
    @patch("app.attio_sync.httpx.Client")
    @patch("app.attio_sync.db")
    def test_company_upsert_uses_correct_api_format(self, mock_db, mock_httpx_cls):
        mock_http = MagicMock()
        mock_httpx_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
        mock_httpx_cls.return_value.__exit__ = MagicMock(return_value=False)

        company_resp = _mock_httpx_response("comp-123")
        person_resp = _mock_httpx_response("person-456")
        mock_http.put.side_effect = [company_resp, person_resp]

        supabase = MagicMock()
        sync_outreach_to_attio(supabase, SAMPLE_ROW)

        # First PUT is the company upsert
        company_call = mock_http.put.call_args_list[0]
        assert "objects/companies/records" in company_call[0][0]
        body = company_call[1]["json"]
        assert body == {"data": {"values": {"name": ["Acme Corp"]}}}
        assert company_call[1]["params"] == {"matching_attribute": "name"}


# ---------------------------------------------------------------------------
# Person upsert
# ---------------------------------------------------------------------------

class TestUpsertPerson:
    @patch("app.attio_sync.ATTIO_API_KEY", "test-key")
    @patch("app.attio_sync.httpx.Client")
    @patch("app.attio_sync.db")
    def test_person_includes_company_link(self, mock_db, mock_httpx_cls):
        mock_http = MagicMock()
        mock_httpx_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
        mock_httpx_cls.return_value.__exit__ = MagicMock(return_value=False)

        company_resp = _mock_httpx_response("comp-123")
        person_resp = _mock_httpx_response("person-456")
        mock_http.put.side_effect = [company_resp, person_resp]

        supabase = MagicMock()
        sync_outreach_to_attio(supabase, SAMPLE_ROW)

        # Second PUT is the person upsert
        person_call = mock_http.put.call_args_list[1]
        body = person_call[1]["json"]
        values = body["data"]["values"]
        assert values["company"] == [
            {"target_object": "companies", "target_record_id": "comp-123"}
        ]
        assert values["linkedin"] == ["https://linkedin.com/in/janesmith"]
        assert person_call[1]["params"] == {"matching_attribute": "linkedin"}

    @patch("app.attio_sync.ATTIO_API_KEY", "test-key")
    @patch("app.attio_sync.httpx.Client")
    @patch("app.attio_sync.db")
    def test_person_without_company_omits_field(self, mock_db, mock_httpx_cls):
        mock_http = MagicMock()
        mock_httpx_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
        mock_httpx_cls.return_value.__exit__ = MagicMock(return_value=False)

        person_resp = _mock_httpx_response("person-789")
        mock_http.put.side_effect = [person_resp]

        row = {**SAMPLE_ROW, "headline": "Software Engineer"}  # no company
        supabase = MagicMock()
        sync_outreach_to_attio(supabase, row)

        # Only one PUT (no company upsert)
        assert mock_http.put.call_count == 1
        person_call = mock_http.put.call_args_list[0]
        values = person_call[1]["json"]["data"]["values"]
        assert "company" not in values

    @patch("app.attio_sync.ATTIO_API_KEY", "test-key")
    @patch("app.attio_sync.httpx.Client")
    @patch("app.attio_sync.db")
    def test_updates_supabase_after_sync(self, mock_db, mock_httpx_cls):
        mock_http = MagicMock()
        mock_httpx_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
        mock_httpx_cls.return_value.__exit__ = MagicMock(return_value=False)

        company_resp = _mock_httpx_response("comp-123")
        person_resp = _mock_httpx_response("person-456")
        mock_http.put.side_effect = [company_resp, person_resp]

        supabase = MagicMock()
        result = sync_outreach_to_attio(supabase, SAMPLE_ROW)

        assert result["person_record_id"] == "person-456"
        assert result["company_record_id"] == "comp-123"

        update_call = mock_db.update_outreach.call_args
        updates = update_call[0][1]
        assert updates["attio_person_record_id"] == "person-456"
        assert updates["attio_company_record_id"] == "comp-123"
        assert "attio_synced_at" in updates


# ---------------------------------------------------------------------------
# sync_all_unsynced
# ---------------------------------------------------------------------------

class TestSyncAllUnsynced:
    @patch("app.attio_sync.time.sleep")
    @patch("app.attio_sync.sync_outreach_to_attio")
    @patch("app.attio_sync.db")
    def test_processes_all_rows(self, mock_db, mock_sync, _sleep):
        mock_db.get_unsynced_outreach.return_value = [
            {**SAMPLE_ROW, "id": "r1"},
            {**SAMPLE_ROW, "id": "r2"},
        ]
        mock_sync.return_value = {"person_record_id": "p-1", "company_record_id": "c-1"}
        supabase = MagicMock()

        result = sync_all_unsynced(supabase)

        assert result["synced"] == 2
        assert result["people"] == 2
        assert result["companies"] == 2

    @patch("app.attio_sync.time.sleep")
    @patch("app.attio_sync.sync_outreach_to_attio")
    @patch("app.attio_sync.db")
    def test_continues_on_error(self, mock_db, mock_sync, _sleep):
        mock_db.get_unsynced_outreach.return_value = [
            {**SAMPLE_ROW, "id": "r1", "full_name": "Failing Person"},
            {**SAMPLE_ROW, "id": "r2"},
        ]
        mock_sync.side_effect = [
            Exception("Attio down"),
            {"person_record_id": "p-2", "company_record_id": None},
        ]
        supabase = MagicMock()

        result = sync_all_unsynced(supabase)

        assert result["synced"] == 1
        assert result["people"] == 1
        assert result["companies"] == 0
        assert len(result["errors"]) == 1
        assert "Failing Person" in result["errors"][0]

    @patch("app.attio_sync.time.sleep")
    @patch("app.attio_sync.sync_outreach_to_attio")
    @patch("app.attio_sync.db")
    def test_no_company_counted_when_none(self, mock_db, mock_sync, _sleep):
        mock_db.get_unsynced_outreach.return_value = [
            {**SAMPLE_ROW, "id": "r1", "headline": "Engineer"},  # no company
        ]
        mock_sync.return_value = {"person_record_id": "p-1", "company_record_id": None}
        supabase = MagicMock()

        result = sync_all_unsynced(supabase)

        assert result["companies"] == 0
        assert result["people"] == 1

    @patch("app.attio_sync.sync_outreach_to_attio")
    @patch("app.attio_sync.db")
    def test_returns_empty_when_no_rows(self, mock_db, mock_sync):
        mock_db.get_unsynced_outreach.return_value = []
        supabase = MagicMock()

        result = sync_all_unsynced(supabase)

        assert result["synced"] == 0
        mock_sync.assert_not_called()

    @patch("app.attio_sync.time.sleep")
    @patch("app.attio_sync.sync_outreach_to_attio")
    @patch("app.attio_sync.db")
    def test_passes_status_filter_and_limit(self, mock_db, mock_sync, _sleep):
        mock_db.get_unsynced_outreach.return_value = []
        supabase = MagicMock()

        sync_all_unsynced(supabase, status_filter="sent", limit=10)

        mock_db.get_unsynced_outreach.assert_called_once_with(
            status_filter="sent", limit=10
        )


# ---------------------------------------------------------------------------
# Admin endpoint
# ---------------------------------------------------------------------------

class TestAdminEndpoint:
    @patch("app.main.ADMIN_API_KEY", "test-admin-key")
    @patch("app.db.get_unsynced_outreach")
    def test_requires_api_key(self, _mock):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.post("/admin/attio/sync-connections")
        assert resp.status_code == 401

    @patch("app.main.ADMIN_API_KEY", "test-admin-key")
    @patch("app.db.get_unsynced_outreach")
    def test_dry_run_returns_count(self, mock_unsynced):
        from fastapi.testclient import TestClient
        from app.main import app

        mock_unsynced.return_value = [SAMPLE_ROW, SAMPLE_ROW]
        client = TestClient(app)
        resp = client.post(
            "/admin/attio/sync-connections?dry_run=true",
            headers={"x-api-key": "test-admin-key"},
        )
        data = resp.json()
        assert data["dry_run"] is True
        assert data["would_sync"] == 2
