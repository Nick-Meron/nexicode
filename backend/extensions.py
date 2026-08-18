from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
jwt = JWTManager()

# Rate limiter — protects against someone hammering an endpoint (either
# maliciously, or by accident e.g. a broken frontend loop). Limits are
# identified by IP address. Default limits apply everywhere unless a
# route overrides them with its own @limiter.limit(...) decorator.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour"],
    storage_uri="memory://",
    # NOTE: "memory://" keeps limits in this process's RAM. That's fine
    # for a single dev server. If you ever deploy with multiple worker
    # processes, switch to storage_uri="redis://..." so all workers share
    # the same counts — otherwise each worker enforces its own separate
    # limit and the real limit becomes (your limit) x (number of workers).
)