from __future__ import annotations

from datetime import datetime

from .extensions import db


class CurrencyRate(db.Model):
    __tablename__ = "currency_rates"

    id = db.Column(db.Integer, primary_key=True)
    base_currency = db.Column(db.String(3), nullable=False, index=True)
    quote_currency = db.Column(db.String(3), nullable=False, index=True)
    rate = db.Column(db.Float, nullable=False)
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class TrackedPair(db.Model):
    __tablename__ = "tracked_pairs"
    __table_args__ = (
        db.UniqueConstraint("base_currency", "quote_currency", name="uq_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    base_currency = db.Column(db.String(3), nullable=False)
    quote_currency = db.Column(db.String(3), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    favorites = db.relationship("UserFavorite", back_populates="user", cascade="all,delete-orphan")


class UserFavorite(db.Model):
    __tablename__ = "user_favorites"
    __table_args__ = (
        db.UniqueConstraint("user_id", "base_currency", "quote_currency", name="uq_user_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    base_currency = db.Column(db.String(3), nullable=False)
    quote_currency = db.Column(db.String(3), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="favorites")

