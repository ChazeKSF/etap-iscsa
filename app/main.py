from flask import Flask, g, render_template, abort, request, redirect, url_for, session, send_from_directory
from werkzeug.security import check_password_hash
import sqlite3
import os

app = Flask(__name__)
app.secret_key = "dev-secret-key-change-this-later"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "etap.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

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
                os.makedirs(UPLOAD_DIR, exist_ok=True)
                safe_filename = f"{assignment['id']}_{control_id}_{file.filename}"
                file_path = os.path.join(UPLOAD_DIR, safe_filename)
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
    db = get_db()

    assignments = db.execute(
        """
        SELECT
            csa_assignments.id,
            csa_assignments.year,
            csa_assignments.status,
            csa_assignments.submitted_at,
            business_units.code AS bu_code,
            business_units.name AS bu_name
        FROM csa_assignments
        JOIN business_units ON csa_assignments.business_unit_id = business_units.id
        ORDER BY csa_assignments.submitted_at DESC
        """
    ).fetchall()

    return render_template(
        "dashboard.html",
        assignments=assignments,
        user_name=session["user_name"],
        user_role=session["user_role"]
    )

@app.route("/dashboard/<int:assignment_id>")
@login_required
def submission_detail(assignment_id):
    db = get_db()

    assignment = db.execute(
        """
        SELECT csa_assignments.*, business_units.name AS bu_name, business_units.code AS bu_code
        FROM csa_assignments
        JOIN business_units ON csa_assignments.business_unit_id = business_units.id
        WHERE csa_assignments.id = ?
        """,
        (assignment_id,)
    ).fetchone()

    if assignment is None:
        abort(404)

    responses = db.execute(
        """
        SELECT responses.*, controls.control_code, controls.question_text
        FROM responses
        JOIN controls ON responses.control_id = controls.id
        WHERE responses.assignment_id = ?
        ORDER BY controls.control_code
        """,
        (assignment_id,)
    ).fetchall()

    # Attach files to each response
    response_list = []
    for r in responses:
        files = db.execute(
            "SELECT * FROM evidence_files WHERE response_id = ?", (r["id"],)
        ).fetchall()
        response_list.append({"response": r, "files": files})

    reviews = db.execute(
        """
        SELECT reviews.*, users.name AS reviewer_name
        FROM reviews
        JOIN users ON reviews.reviewed_by = users.id
        WHERE reviews.assignment_id = ?
        ORDER BY reviews.reviewed_at DESC
        """,
        (assignment_id,)
    ).fetchall()

    return render_template(
        "detail.html",
        assignment=assignment,
        response_list=response_list,
        reviews=reviews,
        user_name=session["user_name"],
        user_role=session["user_role"]
    )

@app.route("/uploads/<path:filename>")
@login_required
def download_file(filename):
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)