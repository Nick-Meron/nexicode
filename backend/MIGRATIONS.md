# Switching to Flask-Migrate (database migrations)

## The problem this solves

Right now your database tables are created by this line in `app.py`:

```python
db.create_all()
```

This line only **creates tables that don't exist yet**. If you already have
a `courses` table and you add a new column to the `Course` model, running
the app again does **nothing** — the new column is silently missing from
the real database, and you get a confusing error the next time you try to
use it.

Flask-Migrate fixes this by tracking every schema change as a small,
numbered "migration" file, so you can apply changes safely — and undo them
if something goes wrong.

## One-time setup (do this once)

1. Make sure `flask-migrate` is installed (it's already in the updated
   `requirements.txt` — just run `pip install -r requirements.txt` again
   with your venv active).

2. Add these two lines to `app.py`. Put them near your other imports and
   `db.init_app(app)` call:

   ```python
   from flask_migrate import Migrate
   # ... inside create_app(), right after db.init_app(app):
   migrate = Migrate(app, db)
   ```

3. **Remove** (or comment out) the `db.create_all()` block at the bottom
   of `create_app()` — migrations replace it entirely:

   ```python
   # with app.app_context():
   #     import models
   #     db.create_all()
   #     logger.info("Database tables verified/created")
   ```

4. In your terminal, with your venv active and inside the `backend`
   folder, run:

   ```
   flask db init
   ```

   This creates a `migrations/` folder — commit this folder to git, it's
   part of your project now (like your models are).

5. Create your first migration from your CURRENT models (the ones your
   database already matches):

   ```
   flask db migrate -m "initial schema"
   flask db upgrade
   ```

   `flask db upgrade` is the command that actually applies changes to
   your real database. `flask db migrate` just writes the migration file
   — it doesn't touch the database yet.

## From now on, whenever you change a model

Example: you add a new column `bio` to the `User` model.

1. Edit the model in `models/__init__.py` as normal.
2. Run:
   ```
   flask db migrate -m "add bio to users"
   flask db upgrade
   ```
3. Done — your real database now has the new column, and the change is
   recorded in `migrations/` so anyone else on the project (or you, on a
   different machine) can run `flask db upgrade` to catch up.

## If something looks wrong

- `flask db migrate` writes a new file into `migrations/versions/` —
  **always open and read it before running `upgrade`**. Auto-detection
  is usually right but not always (e.g. renaming a column looks like
  "delete one column, add another" unless you edit the file to say
  otherwise).
- If you want to undo the last migration: `flask db downgrade`