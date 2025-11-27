from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from typing import Iterable

import requests
from flask import current_app

from ..extensions import db, redis_client
from ..models import CurrencyRate


class RateProvider:
    """Fetches rates from the upstream API with Redis caching."""

    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds

    def get_rates(self, pairs: Iterable[tuple[str, str]]) -> list[dict]:
        grouped: dict[str, list[str]] = defaultdict(list)
        for base, quote in pairs:
            grouped[base.upper()].append(quote.upper())

        aggregated: list[dict] = []
        for base, symbols in grouped.items():
            api_rates = self._fetch_rates_for_base(base, symbols)
            for quote, rate in api_rates.items():
                aggregated.append(
                    {
                        "pair": f"{base}:{quote}",
                        "base": base,
                        "quote": quote,
                        "rate": rate,
                        "fetched_at": datetime.utcnow().isoformat(),
                    }
                )
        return aggregated

    def _fetch_rates_for_base(self, base: str, symbols: list[str]) -> dict[str, float]:
        cache_key = self._build_cache_key(base, symbols)
        cached = self._read_cache(cache_key)
        if cached:
            return cached

        params = {
            "base_currency": base,
            "currencies": ",".join(symbols),
            "apikey": current_app.config["FREECURRENCY_API_KEY"],
        }
        response = requests.get(
            current_app.config["FREECURRENCY_API_URL"], params=params, timeout=15
        )
        response.raise_for_status()
        data = response.json()
        payload = data.get("data", {})
        rates: dict[str, float] = {quote.upper(): float(value) for quote, value in payload.items()}

        if rates:
            self._write_cache(cache_key, rates)
            self._persist_rates(base, rates)

        return rates

    @staticmethod
    def _build_cache_key(base: str, symbols: list[str]) -> str:
        joined = ",".join(sorted(symbols))
        return f"rates:{base}:{joined}"

    def _read_cache(self, key: str) -> dict[str, float] | None:
        if not redis_client:
            return None
        payload = redis_client.get(key)
        if not payload:
            return None
        return json.loads(payload)

    def _write_cache(self, key: str, payload: dict[str, float]) -> None:
        if not redis_client:
            return
        redis_client.setex(key, self.ttl_seconds, json.dumps(payload))

    def _persist_rates(self, base: str, rates: dict[str, float]) -> None:
        for quote, rate in rates.items():
            db.session.add(
                CurrencyRate(base_currency=base, quote_currency=quote, rate=rate)
            )
        db.session.commit()

