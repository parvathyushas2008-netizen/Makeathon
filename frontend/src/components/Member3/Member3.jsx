import React, { useEffect, useState } from "react";
import "./Member3.css";

const API = "http://localhost:5000/api/member3";

function Member3() {

    const [subscriptions, setSubscriptions] = useState([]);
    const [discounts, setDiscounts] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [planName, setPlanName] = useState("");
    const [amount, setAmount] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [billingCycle, setBillingCycle] = useState("Monthly");

    const [name, setName] = useState("");
    const [type, setType] = useState("Percentage");
    const [value, setValue] = useState("");
    const [minPurchase, setMinPurchase] = useState(0);
    const [minQuantity, setMinQuantity] = useState(1);
    const [discountStart, setDiscountStart] = useState("");
    const [discountEnd, setDiscountEnd] = useState("");
    const [usageLimit, setUsageLimit] = useState("");
    const [scope, setScope] = useState("Subscriptions");

    const [message, setMessage] = useState("");

    // LOAD DATA
    const loadData = async () => {
        try {
            const [s, d] = await Promise.all([
                fetch(`${API}/subscriptions`),
                fetch(`${API}/discounts`)
            ]);

            setSubscriptions(await s.json());
            setDiscounts(await d.json());
        } catch {
            setMessage("Unable to connect to server");
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ADD SUBSCRIPTION
    const addSubscription = async (e) => {
        e.preventDefault();

        const response = await fetch(`${API}/subscriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customerName,
                planName,
                amount,
                quantity,
                startDate,
                endDate,
                billingCycle
            })
        });

        const data = await response.json();
        setMessage(data.message);

        if (response.ok) {
            setCustomerName("");
            setPlanName("");
            setAmount("");
            setQuantity(1);
            setStartDate("");
            setEndDate("");
            loadData();
        }
    };

    // UPDATE STATUS
    const changeStatus = async (id, status) => {
        const response = await fetch(
            `${API}/subscriptions/${id}/status`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            }
        );

        const data = await response.json();
        setMessage(data.message);
        loadData();
    };

    // RENEW SUBSCRIPTION
    const renewSubscription = async (id) => {
        const newDate = window.prompt("Enter new expiry date (YYYY-MM-DD)");

        if (!newDate) return;

        const response = await fetch(
            `${API}/subscriptions/${id}/renew`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endDate: newDate })
            }
        );

        const data = await response.json();
        setMessage(data.message);
        loadData();
    };

    // ADD DISCOUNT
    const addDiscount = async (e) => {
        e.preventDefault();

        const response = await fetch(`${API}/discounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                type,
                value,
                minPurchase,
                minQuantity,
                startDate: discountStart,
                endDate: discountEnd,
                usageLimit,
                scope
            })
        });

        const data = await response.json();
        setMessage(data.message);

        if (response.ok) {
            setName("");
            setValue("");
            setUsageLimit("");
            loadData();
        }
    };

    // APPLY DISCOUNT
    const applyDiscount = async (subscriptionId) => {
        const selected = window.prompt(
            "Enter Discount ID:\n" +
            discounts.map(d => `${d.id} - ${d.name}`).join("\n")
        );

        if (!selected) return;

        const response = await fetch(
            `${API}/subscriptions/${subscriptionId}/apply-discount`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    discountId: selected
                })
            }
        );

        const data = await response.json();
        setMessage(
            response.ok
                ? `${data.message}. Final amount: ₹${data.finalAmount}`
                : data.message
        );

        loadData();
    };

    return (
        <div className="member3-container">

            <h1>Subscription & Discount Management</h1>

            {message && <p className="message">{message}</p>}

            {/* SUBSCRIPTION FORM */}

            <section className="member3-card">

                <h2>Create Subscription</h2>

                <form onSubmit={addSubscription}>

                    <input
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                    />

                    <input
                        placeholder="Plan Name"
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                        required
                    />

                    <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                    />

                    <input
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        min="1"
                        required
                    />

                    <label>Billing Cycle</label>

                    <select
                        value={billingCycle}
                        onChange={e => setBillingCycle(e.target.value)}
                    >
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Yearly</option>
                    </select>

                    <label>Start Date</label>

                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        required
                    />

                    <label>Expiry Date</label>

                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                    />

                    <button type="submit">
                        Create Subscription
                    </button>

                </form>

            </section>

            {/* SUBSCRIPTION TABLE */}

            <section className="member3-card">

                <h2>All Subscriptions</h2>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Customer</th>
                                <th>Plan</th>
                                <th>Amount</th>
                                <th>Quantity</th>
                                <th>Cycle</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {subscriptions.map(s => (
                                <tr key={s.id}>
                                    <td>{s.id}</td>
                                    <td>{s.customerName}</td>
                                    <td>{s.planName}</td>
                                    <td>₹{s.amount}</td>
                                    <td>{s.quantity}</td>
                                    <td>{s.billingCycle}</td>
                                    <td>{s.status}</td>
                                    <td>
                                        {s.status === "Active" && (
                                            <button onClick={() =>
                                                changeStatus(s.id, "Paused")
                                            }>
                                                Pause
                                            </button>
                                        )}

                                        {s.status === "Paused" && (
                                            <button onClick={() =>
                                                changeStatus(s.id, "Active")
                                            }>
                                                Resume
                                            </button>
                                        )}

                                        {s.status !== "Closed" && (
                                            <>
                                                <button onClick={() =>
                                                    renewSubscription(s.id)
                                                }>
                                                    Renew
                                                </button>

                                                <button onClick={() =>
                                                    changeStatus(s.id, "Closed")
                                                }>
                                                    Close
                                                </button>
                                            </>
                                        )}

                                        <button onClick={() =>
                                            applyDiscount(s.id)
                                        }>
                                            Apply Discount
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </section>

            {/* DISCOUNT FORM */}

            <section className="member3-card">

                <h2>Create Discount</h2>

                <form onSubmit={addDiscount}>

                    <input
                        placeholder="Discount Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />

                    <label>Discount Type</label>

                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option>Percentage</option>
                        <option>Fixed</option>
                    </select>

                    <input
                        type="number"
                        placeholder="Discount Value"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                    />

                    <input
                        type="number"
                        placeholder="Minimum Purchase"
                        value={minPurchase}
                        onChange={e => setMinPurchase(e.target.value)}
                        min="0"
                    />

                    <input
                        type="number"
                        placeholder="Minimum Quantity"
                        value={minQuantity}
                        onChange={e => setMinQuantity(e.target.value)}
                        min="1"
                        required
                    />

                    <label>Start Date</label>

                    <input
                        type="date"
                        value={discountStart}
                        onChange={e => setDiscountStart(e.target.value)}
                        required
                    />

                    <label>End Date</label>

                    <input
                        type="date"
                        value={discountEnd}
                        onChange={e => setDiscountEnd(e.target.value)}
                        required
                    />

                    <input
                        type="number"
                        placeholder="Usage Limit"
                        value={usageLimit}
                        onChange={e => setUsageLimit(e.target.value)}
                        min="1"
                        required
                    />

                    <label>Discount Applies To</label>

                    <select
                        value={scope}
                        onChange={e => setScope(e.target.value)}
                    >
                        <option>Products</option>
                        <option>Subscriptions</option>
                        <option>Both</option>
                    </select>

                    <button type="submit">
                        Create Discount
                    </button>

                </form>

            </section>

            {/* DISCOUNT TABLE */}

            <section className="member3-card">

                <h2>Available Discounts</h2>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Minimum Purchase</th>
                                <th>Usage</th>
                                <th>End Date</th>
                            </tr>
                        </thead>

                        <tbody>
                            {discounts.map(d => (
                                <tr key={d.id}>
                                    <td>{d.id}</td>
                                    <td>{d.name}</td>
                                    <td>{d.type}</td>
                                    <td>
                                        {d.type === "Percentage"
                                            ? `${d.value}%`
                                            : `₹${d.value}`}
                                    </td>
                                    <td>₹{d.minPurchase}</td>
                                    <td>
                                        {d.usedCount}/{d.usageLimit}
                                    </td>
                                    <td>{d.endDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </section>

        </div>
    );
}

export default Member3;