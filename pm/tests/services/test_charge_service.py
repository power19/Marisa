"""Tests for charge generation and status logic."""
import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from app.services.lease_service import _periods
from app.services.charge_service import compute_status
from app.models.rent_charge import ChargeStatus


class TestPeriods:
    def test_three_month_lease(self):
        periods = _periods(date(2026, 1, 15), date(2026, 3, 31), billing_day=5)
        assert len(periods) == 3
        assert periods[0] == (date(2026, 1, 1), date(2026, 1, 5))
        assert periods[1] == (date(2026, 2, 1), date(2026, 2, 5))
        assert periods[2] == (date(2026, 3, 1), date(2026, 3, 5))

    def test_single_month_lease(self):
        periods = _periods(date(2026, 6, 1), date(2026, 6, 30), billing_day=1)
        assert len(periods) == 1
        assert periods[0] == (date(2026, 6, 1), date(2026, 6, 1))

    def test_billing_day_respected(self):
        periods = _periods(date(2026, 1, 1), date(2026, 2, 28), billing_day=15)
        assert periods[0][1] == date(2026, 1, 15)
        assert periods[1][1] == date(2026, 2, 15)

    def test_year_boundary(self):
        periods = _periods(date(2025, 11, 1), date(2026, 2, 28), billing_day=1)
        assert len(periods) == 4
        assert periods[2] == (date(2026, 1, 1), date(2026, 1, 1))

    def test_end_date_before_second_period(self):
        # 45-day lease: should get 2 monthly period rows
        periods = _periods(date(2026, 1, 1), date(2026, 2, 14), billing_day=10)
        assert len(periods) == 2


class TestComputeStatus:
    def _charge(self, amount_due, amount_paid, due_date, status=ChargeStatus.due):
        ch = MagicMock()
        ch.amount_due = Decimal(str(amount_due))
        ch.amount_paid = Decimal(str(amount_paid))
        ch.due_date = due_date
        ch.status = status
        return ch

    def test_paid(self):
        ch = self._charge(1000, 1000, date(2026, 6, 5))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.paid

    def test_overpaid_is_paid(self):
        ch = self._charge(1000, 1100, date(2026, 6, 5))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.paid

    def test_partial(self):
        ch = self._charge(1000, 400, date(2026, 6, 10))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.partial

    def test_overdue(self):
        ch = self._charge(1000, 0, date(2026, 6, 1))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.overdue

    def test_due(self):
        ch = self._charge(1000, 0, date(2026, 6, 10))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.due

    def test_waived_unchanged(self):
        ch = self._charge(1000, 0, date(2026, 6, 1))
        ch.status = ChargeStatus.waived
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.waived

    def test_partial_overdue(self):
        """Partial payment but past due date — still partial (partially paid takes priority)."""
        ch = self._charge(1000, 400, date(2026, 6, 1))
        assert compute_status(ch, date(2026, 6, 5)) == ChargeStatus.partial
