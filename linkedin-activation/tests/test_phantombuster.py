from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest

from app.phantombuster import (
    BASE_URL,
    S3_BASE,
    launch_agent,
    fetch_agent_info,
    download_result_csv,
    launch_connections_export,
    launch_message_sender,
    format_date_for_pb,
    validate_webhook_secret,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _mock_response(json_data=None, text_data=None, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.raise_for_status = MagicMock()
    if json_data is not None:
        resp.json.return_value = json_data
    if text_data is not None:
        resp.text = text_data
    return resp


# ---------------------------------------------------------------------------
# launch_agent
# ---------------------------------------------------------------------------

class TestLaunchAgent:
    @patch("app.phantombuster.PHANTOMBUSTER_API_KEY", "test-api-key")
    @patch("app.phantombuster.httpx.post")
    def test_sends_correct_headers(self, mock_post):
        mock_post.return_value = _mock_response({"containerId": "c-123"})

        launch_agent("agent-1")

        call_kwargs = mock_post.call_args
        headers = call_kwargs.kwargs["headers"]
        assert headers["X-Phantombuster-Key-1"] == "test-api-key"
        assert headers["Content-Type"] == "application/json"

    @patch("app.phantombuster.httpx.post")
    def test_posts_to_correct_url(self, mock_post):
        mock_post.return_value = _mock_response({"containerId": "c-123"})

        launch_agent("agent-1")

        assert mock_post.call_args.args[0] == f"{BASE_URL}/agents/launch"

    @patch("app.phantombuster.httpx.post")
    def test_bonus_argument_is_json_string(self, mock_post):
        mock_post.return_value = _mock_response({"containerId": "c-123"})

        bonus = {"key": "value", "num": 42}
        launch_agent("agent-1", bonus)

        body = mock_post.call_args.kwargs["json"]
        assert body["id"] == "agent-1"
        # bonusArgument must be a JSON string, not a dict
        assert isinstance(body["bonusArgument"], str)
        assert json.loads(body["bonusArgument"]) == bonus

    @patch("app.phantombuster.httpx.post")
    def test_no_bonus_argument_omits_field(self, mock_post):
        mock_post.return_value = _mock_response({"containerId": "c-123"})

        launch_agent("agent-1")

        body = mock_post.call_args.kwargs["json"]
        assert "bonusArgument" not in body


# ---------------------------------------------------------------------------
# fetch_agent_info
# ---------------------------------------------------------------------------

class TestFetchAgentInfo:
    @patch("app.phantombuster.httpx.get")
    def test_sends_get_with_agent_id(self, mock_get):
        mock_get.return_value = _mock_response({"s3Folder": "abc", "orgS3Folder": "org123"})

        result = fetch_agent_info("agent-1")

        assert mock_get.call_args.args[0] == f"{BASE_URL}/agents/fetch"
        assert mock_get.call_args.kwargs["params"] == {"id": "agent-1"}
        assert result["s3Folder"] == "abc"


# ---------------------------------------------------------------------------
# download_result_csv
# ---------------------------------------------------------------------------

class TestDownloadResultCsv:
    @patch("app.phantombuster.httpx.get")
    def test_constructs_correct_s3_url(self, mock_get):
        mock_get.return_value = _mock_response(text_data="col1,col2\na,b\n")

        result = download_result_csv("folder-1", "org-1")

        expected_url = f"{S3_BASE}/org-1/folder-1/result.csv"
        assert mock_get.call_args.args[0] == expected_url
        assert result == "col1,col2\na,b\n"

    @patch("app.phantombuster.httpx.get")
    def test_custom_file_name(self, mock_get):
        mock_get.return_value = _mock_response(text_data="data")

        download_result_csv("folder-1", "org-1", "output.csv")

        expected_url = f"{S3_BASE}/org-1/folder-1/output.csv"
        assert mock_get.call_args.args[0] == expected_url


# ---------------------------------------------------------------------------
# launch_connections_export
# ---------------------------------------------------------------------------

class TestLaunchConnectionsExport:
    @patch("app.phantombuster.PB_CONNECTIONS_AGENT_ID", "conn-agent-123")
    @patch("app.phantombuster.launch_agent")
    def test_sends_both_required_fields(self, mock_launch):
        mock_launch.return_value = {"containerId": "c-456"}

        launch_connections_export("03-06-2026")

        args = mock_launch.call_args
        assert args.args[0] == "conn-agent-123"
        bonus = args.args[1]
        assert bonus["onlyRetrieveProfilesAfterDate"] is True
        assert bonus["dateAfter"] == "03-06-2026"


# ---------------------------------------------------------------------------
# launch_message_sender
# ---------------------------------------------------------------------------

class TestLaunchMessageSender:
    @patch("app.phantombuster.launch_agent")
    def test_sends_spreadsheet_url_and_message(self, mock_launch):
        mock_launch.return_value = {"containerId": "c-789"}

        launch_message_sender("https://linkedin.com/in/someone", "Hey!")

        args = mock_launch.call_args
        bonus = args.args[1]
        assert bonus["spreadsheetUrl"] == "https://linkedin.com/in/someone"
        assert bonus["message"] == "Hey!"


# ---------------------------------------------------------------------------
# format_date_for_pb
# ---------------------------------------------------------------------------

class TestFormatDateForPb:
    def test_formats_as_mm_dd_yyyy(self):
        dt = datetime(2026, 3, 6)
        assert format_date_for_pb(dt) == "03-06-2026"

    def test_pads_single_digit_month_and_day(self):
        dt = datetime(2026, 1, 5)
        assert format_date_for_pb(dt) == "01-05-2026"


# ---------------------------------------------------------------------------
# validate_webhook_secret
# ---------------------------------------------------------------------------

class TestValidateWebhookSecret:
    @patch("app.phantombuster.PB_WEBHOOK_SECRET", "my-secret-123")
    def test_correct_secret_returns_true(self):
        assert validate_webhook_secret("my-secret-123") is True

    @patch("app.phantombuster.PB_WEBHOOK_SECRET", "my-secret-123")
    def test_wrong_secret_returns_false(self):
        assert validate_webhook_secret("wrong-secret") is False

    @patch("app.phantombuster.PB_WEBHOOK_SECRET", "")
    def test_empty_config_returns_false(self):
        assert validate_webhook_secret("anything") is False
