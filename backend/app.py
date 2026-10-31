import os
from dotenv import load_dotenv

load_dotenv()
from flask import Flask, request, render_template, session, redirect, url_for
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")


from functools import wraps

def role_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login_page"))

            if session.get("role") not in allowed_roles:
                return "Access Denied! You don't have permission."

            return function(*args, **kwargs)

        return wrapper
    return decorator
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE")
    )


@app.route("/")
def home():
    return render_template("register.html")


@app.route("/login-page")
def login_page():
    return render_template("login.html")


@app.route("/register", methods=["POST"])
def register():
    name = request.form.get("name")
    email = request.form.get("email")
    password = request.form.get("password")
    confirm_password = request.form.get("confirmPassword")

    if password != confirm_password:
        return "Passwords do not match!"

    password_hash = generate_password_hash(password)

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        sql = """
            INSERT INTO users (full_name, email, password_hash)
            VALUES (%s, %s, %s)
        """
        cursor.execute(sql, (name, email, password_hash))
        connection.commit()

        return "Registration successful!"

    except mysql.connector.IntegrityError:
        return "This email is already registered!"

    finally:
        cursor.close()
        connection.close()


@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM users WHERE email = %s",
            (email,)
        )

        user = cursor.fetchone()

        if user and check_password_hash(
            user["password_hash"], password
        ):
            session["user_id"] = user["id"]
            session["user_name"] = user["full_name"]
            session["role"] = user["role"]

            return redirect(url_for("profile"))

        return "Invalid email or password!"

    finally:
        cursor.close()
        connection.close()


@app.route("/profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
    "SELECT full_name, email, role FROM users WHERE id = %s",
    (session["user_id"],)
)
        user = cursor.fetchone()

        if not user:
            session.clear()
            return redirect(url_for("login_page"))

        return render_template(
    "profile.html",
    user_name=user["full_name"],
    user_role=user["role"]
)
    finally:
        cursor.close()
        connection.close()


@app.route("/edit-profile")
def edit_profile():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT full_name, email FROM users WHERE id = %s",
            (session["user_id"],)
        )
        user = cursor.fetchone()

        if not user:
            return redirect(url_for("login_page"))

        return render_template(
            "edit_profile.html",
            user_name=user["full_name"],
            user_email=user["email"]
        )
    finally:
        cursor.close()
        connection.close()
@app.route("/update-profile", methods=["POST"])
def update_profile():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    name = request.form.get("name")
    email = request.form.get("email")

    if not name or not email:
        return "Name and email are required!"

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE users
            SET full_name = %s, email = %s
            WHERE id = %s
            """,
            (name, email, session["user_id"])
        )

        connection.commit()
        session["user_name"] = name

        return redirect(url_for("profile"))

    except mysql.connector.IntegrityError:
        return "This email is already used by another account!"

    finally:
        cursor.close()
        connection.close()
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


@app.route("/admin-test")
@role_required("Admin")
def admin_test():
    return "Admin access granted!"
if __name__ == "__main__":
    app.run(debug=True)
