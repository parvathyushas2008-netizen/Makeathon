from flask import Flask, render_template, request, redirect, url_for, flash
from database import get_connection, create_tables
from datetime import date

app = Flask(__name__)
app.secret_key = "billing_secret_key"


# ---------------- HOME ----------------

@app.route("/")
def home():
    return redirect(url_for("billing"))


# ---------------- BILLING PAGE ----------------

@app.route("/billing")
def billing():

    conn = get_connection()

    invoices = conn.execute(
        "SELECT * FROM invoices ORDER BY id DESC"
    ).fetchall()

    conn.close()

    return render_template("billing.html", invoices=invoices)


# ---------------- ADD NEW INVOICE ----------------

@app.route("/add_invoice", methods=["POST"])
def add_invoice():

    conn = get_connection()

    try:
        customer_name = request.form.get("customer_name", "").strip()
        subscription_id = request.form.get("subscription_id", "").strip()
        invoice_date = request.form.get("invoice_date")
        due_date = request.form.get("due_date")

        subtotal = float(request.form.get("subtotal", 0))
        tax = float(request.form.get("tax", 0))
        discount = float(request.form.get("discount", 0))

        if not customer_name or not invoice_date or not due_date:
            raise ValueError("Please fill all required fields.")

        if subtotal <= 0 or tax < 0 or discount < 0:
            raise ValueError("Enter valid invoice amounts.")

        if discount > subtotal + tax:
            raise ValueError("Discount cannot exceed the invoice amount.")

        if due_date < invoice_date:
            raise ValueError("Due date cannot be before invoice date.")

        total = subtotal + tax - discount

        # Prevent duplicate invoice
        if subscription_id:

            existing = conn.execute("""
                SELECT id FROM invoices
                WHERE subscription_id = ?
                AND invoice_date = ?
                AND status != 'Cancelled'
            """, (subscription_id, invoice_date)).fetchone()

            if existing:
                raise ValueError(
                    "An invoice already exists for this subscription and date."
                )

        # Generate invoice number
        next_id = conn.execute(
            "SELECT COALESCE(MAX(id), 0) + 1 FROM invoices"
        ).fetchone()[0]

        invoice_number = (
            "INV-" + date.today().strftime("%Y%m%d")
            + "-" + str(next_id)
        )

        conn.execute("""
            INSERT INTO invoices
            (invoice_number, customer_name, subscription_id,
             invoice_date, due_date, subtotal, tax, discount,
             total_amount, paid_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Draft')
        """, (
            invoice_number, customer_name, subscription_id,
            invoice_date, due_date, subtotal, tax, discount, total
        ))

        conn.commit()
        flash("Draft invoice created successfully!")

    except (ValueError, TypeError) as e:
        flash(str(e))

    finally:
        conn.close()

    return redirect(url_for("billing"))


# ---------------- CONFIRM INVOICE ----------------

@app.route("/confirm_invoice/<int:id>", methods=["POST"])
def confirm_invoice(id):

    conn = get_connection()

    invoice = conn.execute(
        "SELECT * FROM invoices WHERE id = ?", (id,)
    ).fetchone()

    if invoice and invoice["status"] == "Draft":

        conn.execute(
            "UPDATE invoices SET status = 'Confirmed' WHERE id = ?",
            (id,)
        )

        conn.commit()
        flash("Invoice confirmed successfully!")

    else:
        flash("Invoice cannot be confirmed.")

    conn.close()

    return redirect(url_for("billing"))


# ---------------- CANCEL INVOICE ----------------

@app.route("/cancel_invoice/<int:id>", methods=["POST"])
def cancel_invoice(id):

    conn = get_connection()

    invoice = conn.execute(
        "SELECT * FROM invoices WHERE id = ?", (id,)
    ).fetchone()

    if invoice and invoice["status"] in ["Draft", "Confirmed"]:

        if invoice["paid_amount"] == 0:

            conn.execute(
                "UPDATE invoices SET status = 'Cancelled' WHERE id = ?",
                (id,)
            )

            conn.commit()
            flash("Invoice cancelled successfully!")

        else:
            flash("An invoice with payments cannot be cancelled directly.")

    else:
        flash("Invoice cannot be cancelled.")

    conn.close()

    return redirect(url_for("billing"))


# ---------------- PRINT INVOICE ----------------

@app.route("/print_invoice/<int:id>")
def print_invoice(id):

    conn = get_connection()

    invoice = conn.execute(
        "SELECT * FROM invoices WHERE id = ?", (id,)
    ).fetchone()

    conn.close()

    if not invoice:
        flash("Invoice not found.")
        return redirect(url_for("billing"))

    return render_template("print_invoice.html", invoice=invoice)


# ---------------- PAYMENT PAGE ----------------

@app.route("/payments")
def payments():

    conn = get_connection()

    # Payment history
    payment_history = conn.execute("""
        SELECT payments.*, invoices.invoice_number,
        invoices.customer_name
        FROM payments
        JOIN invoices ON payments.invoice_id = invoices.id
        ORDER BY payments.id DESC
    """).fetchall()

    # Confirmed invoices with remaining balance
    pending_invoices = conn.execute("""
        SELECT * FROM invoices
        WHERE status = 'Confirmed'
        AND paid_amount < total_amount
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return render_template(
        "payments.html",
        payments=payment_history,
        unpaid_invoices=pending_invoices
    )


# ---------------- ADD PAYMENT ----------------

@app.route("/add_payment", methods=["POST"])
def add_payment():

    conn = get_connection()

    try:
        invoice_id = request.form.get("invoice_id")
        payment_method = request.form.get("payment_method")
        amount = float(request.form.get("amount", 0))
        payment_date = request.form.get("payment_date")
        note = request.form.get("note", "").strip()

        if not invoice_id or not payment_method or not payment_date:
            raise ValueError("Please fill all required payment details.")

        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        invoice = conn.execute(
            "SELECT * FROM invoices WHERE id = ?",
            (invoice_id,)
        ).fetchone()

        if not invoice:
            raise ValueError("Invoice not found.")

        if invoice["status"] != "Confirmed":
            raise ValueError("Only confirmed invoices can receive payments.")

        balance = invoice["total_amount"] - invoice["paid_amount"]

        if amount > balance:
            raise ValueError("Payment cannot exceed the remaining balance.")

        conn.execute("""
            INSERT INTO payments
            (invoice_id, payment_method, amount, payment_date, note)
            VALUES (?, ?, ?, ?, ?)
        """, (
            invoice_id, payment_method, amount, payment_date, note
        ))

        new_paid_amount = invoice["paid_amount"] + amount

        if new_paid_amount >= invoice["total_amount"]:
            new_status = "Paid"
        else:
            new_status = "Confirmed"

        conn.execute("""
            UPDATE invoices
            SET paid_amount = ?, status = ?
            WHERE id = ?
        """, (new_paid_amount, new_status, invoice_id))

        conn.commit()
        flash("Payment recorded successfully!")

    except (ValueError, TypeError) as e:
        flash(str(e))

    finally:
        conn.close()

    return redirect(url_for("payments"))


# ---------------- REPORTS PAGE ----------------

@app.route("/reports")
def reports():

    conn = get_connection()

    total_revenue = conn.execute("""
        SELECT COALESCE(SUM(paid_amount), 0)
        FROM invoices
        WHERE status != 'Cancelled'
    """).fetchone()[0]

    outstanding = conn.execute("""
        SELECT COALESCE(SUM(total_amount - paid_amount), 0)
        FROM invoices
        WHERE status = 'Confirmed'
    """).fetchone()[0]

    total_invoices = conn.execute("""
        SELECT COUNT(*) FROM invoices
        WHERE status != 'Cancelled'
    """).fetchone()[0]

    active_subscriptions = conn.execute("""
        SELECT COUNT(DISTINCT subscription_id)
        FROM invoices
        WHERE subscription_id IS NOT NULL
        AND subscription_id != ''
        AND status != 'Cancelled'
    """).fetchone()[0]

    overdue_invoices = conn.execute("""
        SELECT COUNT(*) FROM invoices
        WHERE due_date < ?
        AND status = 'Confirmed'
        AND paid_amount < total_amount
    """, (date.today().isoformat(),)).fetchone()[0]

    overdue_list = conn.execute("""
        SELECT * FROM invoices
        WHERE due_date < ?
        AND status = 'Confirmed'
        AND paid_amount < total_amount
        ORDER BY due_date
    """, (date.today().isoformat(),)).fetchall()

    monthly_revenue = conn.execute("""
        SELECT SUBSTR(payment_date, 1, 7) AS month,
        SUM(amount) AS revenue
        FROM payments
        GROUP BY SUBSTR(payment_date, 1, 7)
        ORDER BY month DESC
    """).fetchall()

    payment_summary = conn.execute("""
        SELECT payment_method, SUM(amount) AS total
        FROM payments
        GROUP BY payment_method
    """).fetchall()

    conn.close()

    return render_template(
        "reports.html",
        total_revenue=total_revenue,
        outstanding=outstanding,
        total_invoices=total_invoices,
        active_subscriptions=active_subscriptions,
        overdue_invoices=overdue_invoices,
        overdue_list=overdue_list,
        monthly_revenue=monthly_revenue,
        payment_summary=payment_summary
    )


# ---------------- RUN APPLICATION ----------------

if __name__ == "__main__":

    create_tables()

    print("Billing Management System Started!")

    app.run(debug=True)