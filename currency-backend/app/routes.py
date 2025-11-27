from __future__ import annotations

from typing import Iterable

from flask import Blueprint, current_app, jsonify, request
from flasgger import swag_from
from werkzeug.security import check_password_hash, generate_password_hash

from .auth import extract_bearer_token, issue_token, revoke_token
from .extensions import db, redis_client
from .models import TrackedPair, User, UserFavorite
from .services.rate_provider import RateProvider

api_bp = Blueprint("api", __name__)


@api_bp.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,DELETE,OPTIONS"
    return response


@api_bp.route("/health", methods=["GET"])
@swag_from(
    {
        "responses": {
            200: {
                "description": "API + Redis health status",
                "examples": {"application/json": {"status": "ok", "redis": True}},
            }
        }
    }
)
def health():
    redis_ok = bool(redis_client and redis_client.ping())
    return jsonify({"status": "ok", "redis": redis_ok})


@api_bp.route("/rates", methods=["GET"])
@swag_from(
    {
        "parameters": [
            {
                "in": "query",
                "name": "pairs",
                "type": "string",
                "required": False,
                "description": "Comma-separated base:quote pairs e.g. USD:EUR,USD:GBP",
            }
        ],
        "responses": {
            200: {
                "description": "List of rate snapshots",
                "examples": {
                    "application/json": {
                        "data": [
                            {
                                "pair": "USD:EUR",
                                "base": "USD",
                                "quote": "EUR",
                                "rate": 0.86,
                                "fetched_at": "2024-05-05T12:00:00Z",
                            }
                        ]
                    }
                },
            }
        },
    }
)
def get_rates():
    pairs = _parse_pairs(request.args.get("pairs"))
    if not pairs:
        default_base = current_app.config["DEFAULT_BASE"]
        default_symbols = current_app.config["DEFAULT_SYMBOLS"]
        pairs = [(default_base, symbol) for symbol in default_symbols]

    provider = RateProvider(current_app.config["RATE_CACHE_TTL"])
    data = provider.get_rates(pairs)
    return jsonify({"data": data})


@api_bp.route("/watchlist", methods=["GET"])
@swag_from({"responses": {200: {"description": "Tracked currency pairs"}}})
def get_watchlist():
    items = TrackedPair.query.order_by(TrackedPair.created_at.desc()).all()
    payload = [
        {
            "id": item.id,
            "base": item.base_currency,
            "quote": item.quote_currency,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]
    return jsonify({"data": payload})


@api_bp.route("/watchlist", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "body",
                "name": "payload",
                "schema": {
                    "type": "object",
                    "properties": {
                        "base": {"type": "string"},
                        "quote": {"type": "string"},
                    },
                    "required": ["base", "quote"],
                },
            }
        ],
        "responses": {201: {"description": "Created"}, 409: {"description": "Duplicate"}},
    }
)
def add_watchlist_item():
    data = request.get_json(force=True) or {}
    base = data.get("base", "").upper()
    quote = data.get("quote", "").upper()

    if not (len(base) == 3 and len(quote) == 3):
        return jsonify({"message": "base and quote must be 3-letter strings"}), 400

    existing = TrackedPair.query.filter_by(base_currency=base, quote_currency=quote).first()
    if existing:
        return jsonify({"message": "Pair already exists"}), 409

    item = TrackedPair(base_currency=base, quote_currency=quote)
    db.session.add(item)
    db.session.commit()
    return (
        jsonify(
            {
                "data": {
                    "id": item.id,
                    "base": item.base_currency,
                    "quote": item.quote_currency,
                    "created_at": item.created_at.isoformat(),
                }
            }
        ),
        201,
    )


@api_bp.route("/watchlist/<int:item_id>", methods=["DELETE"])
@swag_from({"responses": {200: {"description": "Deleted"}}})
def delete_watchlist_item(item_id: int):
    item = TrackedPair.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "deleted"})


@api_bp.route("/users", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "body",
                "schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                    },
                    "required": ["name", "email"],
                },
            }
        ],
        "responses": {201: {"description": "User created"}, 409: {"description": "Email exists"}},
    }
)
def create_user():
    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"message": "name, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"message": "Email already registered", "data": {"id": existing.id}}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"data": serialize_user(user)}), 201


@api_bp.route("/users/<int:user_id>", methods=["GET"])
@swag_from({"responses": {200: {"description": "User profile"}}})
def get_user(user_id: int):
    user = User.query.get_or_404(user_id)
    return jsonify({"data": serialize_user(user)})


@api_bp.route("/users/<int:user_id>/favorites", methods=["GET"])
@swag_from({"responses": {200: {"description": "Favorite currency pairs"}}})
def get_favorites(user_id: int):
    user = User.query.get_or_404(user_id)
    payload = [serialize_favorite(fav) for fav in user.favorites]
    return jsonify({"data": payload})


@api_bp.route("/users/<int:user_id>/favorites", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "body",
                "schema": {
                    "type": "object",
                    "properties": {
                        "base": {"type": "string"},
                        "quote": {"type": "string"},
                    },
                    "required": ["base", "quote"],
                },
            }
        ],
        "responses": {201: {"description": "Favorite created"}, 409: {"description": "Already starred"}},
    }
)
def add_favorite(user_id: int):
    user = User.query.get_or_404(user_id)
    data = request.get_json(force=True) or {}
    base = data.get("base", "").upper()
    quote = data.get("quote", "").upper()

    if not (len(base) == 3 and len(quote) == 3):
        return jsonify({"message": "base and quote must be 3-letter strings"}), 400

    existing = UserFavorite.query.filter_by(
        user_id=user.id, base_currency=base, quote_currency=quote
    ).first()
    if existing:
        return jsonify({"message": "Already starred"}), 409

    favorite = UserFavorite(user=user, base_currency=base, quote_currency=quote)
    db.session.add(favorite)
    db.session.commit()
    return jsonify({"data": serialize_favorite(favorite)}), 201


@api_bp.route("/users/<int:user_id>/favorites/<int:fav_id>", methods=["DELETE"])
@swag_from({ "responses": {200: {"description": "Favorite removed"}}})
def delete_favorite(user_id: int, fav_id: int):
    favorite = UserFavorite.query.filter_by(id=fav_id, user_id=user_id).first_or_404()
    db.session.delete(favorite)
    db.session.commit()
    return jsonify({"message": "deleted"})


@api_bp.route("/users/<int:user_id>/rates", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "body",
                "schema": {
                    "type": "object",
                    "properties": {
                        "pairs": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "base": {"type": "string"},
                                    "quote": {"type": "string"},
                                },
                                "required": ["base", "quote"],
                            },
                        },
                        "use_favorites": {"type": "boolean"},
                    },
                },
            }
        ],
        "responses": {
            200: {"description": "Rates calculated for requested/favorite pairs"},
            400: {"description": "Invalid payload"},
        },
    }
)
def request_user_rates(user_id: int):
    user = User.query.get_or_404(user_id)
    data = request.get_json(force=True) or {}
    raw_pairs = data.get("pairs") or []
    use_favorites = data.get("use_favorites", not raw_pairs)

    pairs: list[tuple[str, str]] = []
    for raw in raw_pairs:
        if not isinstance(raw, dict):
            continue
        base = raw.get("base", "").upper()
        quote = raw.get("quote", "").upper()
        if len(base) == 3 and len(quote) == 3:
            pairs.append((base, quote))

    if use_favorites:
        favorite_pairs = [(fav.base_currency, fav.quote_currency) for fav in user.favorites]
        pairs.extend(favorite_pairs)

    sanitized = list(dict.fromkeys(pairs))  # dedupe / preserve order
    if not sanitized:
        return jsonify({"message": "No valid currency pairs provided"}), 400

    provider = RateProvider(current_app.config["RATE_CACHE_TTL"])
    data = provider.get_rates(sanitized)
    return jsonify({"data": data})


@api_bp.route("/auth/login", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "body",
                "schema": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string"},
                        "password": {"type": "string"},
                    },
                    "required": ["email", "password"],
                },
            }
        ],
        "responses": {
            200: {"description": "Authentication successful"},
            401: {"description": "Invalid credentials"},
        },
    }
)
def login():
    data = request.get_json(force=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = issue_token(user.id)
    return jsonify({"data": {"token": token, "user": serialize_user(user)}})


@api_bp.route("/auth/logout", methods=["POST"])
@swag_from(
    {
        "parameters": [
            {
                "in": "header",
                "name": "Authorization",
                "type": "string",
                "description": "Bearer <token>",
                "required": True,
            }
        ],
        "responses": {200: {"description": "Token revoked"}},
    }
)
def logout():
    token = extract_bearer_token()
    if not token:
        return jsonify({"message": "Missing bearer token"}), 400
    revoke_token(token)
    return jsonify({"message": "logged out"})
    item = TrackedPair.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "deleted"})


def _parse_pairs(raw_pairs: str | None) -> list[tuple[str, str]]:
    if not raw_pairs:
        return []
    pairs: list[tuple[str, str]] = []
    for chunk in raw_pairs.split(","):
        parts = chunk.split(":")
        if len(parts) != 2:
            continue
        base, quote = parts[0].strip().upper(), parts[1].strip().upper()
        if len(base) == 3 and len(quote) == 3:
            pairs.append((base, quote))
    return pairs


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }


def serialize_favorite(favorite: UserFavorite) -> dict:
    return {
        "id": favorite.id,
        "base": favorite.base_currency,
        "quote": favorite.quote_currency,
        "created_at": favorite.created_at.isoformat(),
    }

