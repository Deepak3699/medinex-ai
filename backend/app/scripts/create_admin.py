import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User


def main() -> int:
    email = settings.admin_bootstrap_email
    password = settings.admin_bootstrap_password
    if not settings.database_url or SessionLocal is None:
        print("Set DATABASE_URL in backend/.env first.", file=sys.stderr)
        return 1
    if not email or not password or len(password) < 10:
        print("Set ADMIN_BOOTSTRAP_EMAIL and a 10+ character ADMIN_BOOTSTRAP_PASSWORD in backend/.env.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email.lower()))
        if existing is not None:
            print("That email already exists; no account was changed.", file=sys.stderr)
            return 1
        db.add(User(email=email.lower(), password_hash=hash_password(password), role="admin"))
        db.commit()
    print("Initial admin account created. Remove the bootstrap credentials from backend/.env now.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
