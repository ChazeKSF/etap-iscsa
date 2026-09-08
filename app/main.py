from flask import Flask, g, render_template, abort, request, redirect, url_for, session
from werkzeug.security import check_password_hash
import sqlite3
import os

app = Flask(__name__)
app.secret_key = "dev-secret-key-change-this-later"  # temporary, we'll move this to .env soon

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "etap.db")

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()

@app.route("/")
def home():
    return "eTap ISCSA is running!"

@app.route("/submit/<token>", methods=["GET", "POST"])
def submit_form(token):
    db = get_db()

    assignment = db.execute(
        "SELECT * FROM csa_assignments WHERE access_token = ?", (token,)
    ).fetchone()

    if assignment is None:
        abort(404)

    bu = db.execute(
        "SELECT * FROM business_units WHERE id = ?", (assignment["business_unit_id"],)
    ).fetchone()

    controls = db.execute("SELECT * FROM controls").fetchall()

    if request.method == "POST":
        for control in controls:
            control_id = control["id"]
            answer = request.form.get(f"answer_{control_id}")
            evidence_text = request.form.get(f"evidence_{control_id}")

            cursor = db.execute(
                """
                INSERT INTO responses (assignment_id, control_id, answer, evidence_text)
                VALUES (?, ?, ?, ?)
                """,
                (assignment["id"], control_id, answer, evidence_text)
            )
            response_id = cursor.lastrowid

            file = request.files.get(f"file_{control_id}")
            if file and file.filename != "":
                upload_folder = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
                )
                os.makedirs(upload_folder, exist_ok=True)

                safe_filename = f"{assignment['id']}_{control_id}_{file.filename}"
                file_path = os.path.join(upload_folder, safe_filename)
                file.save(file_path)

                db.execute(
                    """
                    INSERT INTO evidence_files (response_id, file_name, file_path)
                    VALUES (?, ?, ?)
                    """,
                    (response_id, file.filename, file_path)
                )

        db.execute(
            "UPDATE csa_assignments SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?",
            (assignment["id"],)
        )
        db.commit()

        return "Thank you! Your CSA responses have been submitted successfully."

    return render_template(
        "submit.html",
        business_unit_name=bu["name"],
        year=assignment["year"],
        controls=controls
    )

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        db = get_db()
        user = db.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)
        ).fetchone()

        if user is None or user["password_hash"] is None:
            error = "Invalid email or password."
        elif not check_password_hash(user["password_hash"], password):
            error = "Invalid email or password."
        else:
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_role"] = user["role"]
            return redirect(url_for("dashboard"))

    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

def login_required(func):
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper

@app.route("/dashboard")
@login_required
def dashboard():
    return f"Welcome, {session['user_name']}! (Role: {session['user_role']}) — Dashboard coming next."

if __name__ == "__main__":
    app.run(debug=True)