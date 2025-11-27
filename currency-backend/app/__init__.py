from __future__ import annotations

from flask import Flask, jsonify

from .config import get_config
from .extensions import db, init_redis
from .routes import api_bp
from flasgger import Swagger


def create_app(config_name: str | None = None) -> Flask:
    """Application factory for the currency tracking backend."""
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    db.init_app(app)
    init_redis(app)
    Swagger(app, config={"headers": []})

    register_blueprints(app)
    register_error_handlers(app)
    register_shellcontext(app)

    with app.app_context():
        db.create_all()

    return app


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(api_bp, url_prefix="/api")


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(error):  # type: ignore[override]
        return jsonify({"message": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(error):  # type: ignore[override]
        return jsonify({"message": "Unexpected server error"}), 500


def register_shellcontext(app: Flask) -> None:
    @app.shell_context_processor
    def make_shell_context():
        from . import models

        return {"db": db, "models": models}

