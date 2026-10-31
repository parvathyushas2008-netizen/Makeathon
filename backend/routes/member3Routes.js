const express = require("express");
const router = express.Router();

// Temporary storage for demonstration
let subscriptions = [];
let discounts = [];

let subscriptionId = 1;
let discountId = 1;

// GET ALL SUBSCRIPTIONS
router.get("/subscriptions", (req, res) => {
    res.json(subscriptions);
});

// ADD SUBSCRIPTION
router.post("/subscriptions", (req, res) => {
    const {
        customerName,
        planName,
        amount,
        quantity,
        startDate,
        endDate,
        billingCycle
    } = req.body;

    if (!customerName || !planName || !startDate || !endDate ||
        !billingCycle || Number(amount) <= 0 ||
        Number(quantity) <= 0) {
        return res.status(400).json({
            message: "Enter valid subscription details"
        });
    }

    const subscription = {
        id: subscriptionId++,
        customerName,
        planName,
        amount: Number(amount),
        quantity: Number(quantity),
        startDate,
        endDate,
        billingCycle,
        status: "Active",
        discountAmount: 0
    };

    subscriptions.push(subscription);

    res.status(201).json({
        message: "Subscription created successfully",
        subscription
    });
});

// UPDATE SUBSCRIPTION
router.put("/subscriptions/:id", (req, res) => {
    const id = Number(req.params.id);

    const subscription = subscriptions.find(s => s.id === id);

    if (!subscription) {
        return res.status(404).json({
            message: "Subscription not found"
        });
    }

    Object.assign(subscription, req.body);

    res.json({
        message: "Subscription updated successfully",
        subscription
    });
});

// CHANGE SUBSCRIPTION STATUS
router.put("/subscriptions/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const subscription = subscriptions.find(s => s.id === id);

    if (!subscription) {
        return res.status(404).json({
            message: "Subscription not found"
        });
    }

    const allowed = ["Active", "Paused", "Closed"];

    if (!allowed.includes(status)) {
        return res.status(400).json({
            message: "Invalid status"
        });
    }

    subscription.status = status;

    res.json({
        message: "Status updated successfully",
        subscription
    });
});

// RENEW SUBSCRIPTION
router.put("/subscriptions/:id/renew", (req, res) => {
    const id = Number(req.params.id);

    const subscription = subscriptions.find(s => s.id === id);

    if (!subscription || subscription.status === "Closed") {
        return res.status(400).json({
            message: "Subscription cannot be renewed"
        });
    }

    const newEndDate = req.body.endDate;

    if (!newEndDate ||
        new Date(newEndDate) <= new Date(subscription.endDate)) {
        return res.status(400).json({
            message: "Enter a valid new expiry date"
        });
    }

    subscription.endDate = newEndDate;
    subscription.status = "Active";

    res.json({
        message: "Subscription renewed successfully",
        subscription
    });
});

// GET ALL DISCOUNTS
router.get("/discounts", (req, res) => {
    res.json(discounts);
});

// CREATE DISCOUNT
router.post("/discounts", (req, res) => {
    const {
        name,
        type,
        value,
        minPurchase,
        minQuantity,
        startDate,
        endDate,
        usageLimit,
        scope
    } = req.body;

    if (!name || !["Percentage", "Fixed"].includes(type) ||
        Number(value) <= 0 || Number(minPurchase) < 0 ||
        Number(minQuantity) < 1 ||
        !startDate || !endDate ||
        Number(usageLimit) < 1 ||
        !["Products", "Subscriptions", "Both"].includes(scope) ||
        new Date(endDate) < new Date(startDate) ||
        (type === "Percentage" && Number(value) > 100)) {
        return res.status(400).json({
            message: "Invalid discount details"
        });
    }

    const discount = {
        id: discountId++,
        name,
        type,
        value: Number(value),
        minPurchase: Number(minPurchase),
        minQuantity: Number(minQuantity),
        startDate,
        endDate,
        usageLimit: Number(usageLimit),
        usedCount: 0,
        scope
    };

    discounts.push(discount);

    res.status(201).json({
        message: "Discount created successfully",
        discount
    });
});

// APPLY DISCOUNT TO SUBSCRIPTION
router.post("/subscriptions/:id/apply-discount", (req, res) => {
    const id = Number(req.params.id);
    const { discountId: selectedDiscountId } = req.body;

    const subscription = subscriptions.find(s => s.id === id);

    const discount = discounts.find(
        d => d.id === Number(selectedDiscountId)
    );

    if (!subscription || !discount) {
        return res.status(404).json({
            message: "Subscription or discount not found"
        });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (today < discount.startDate ||
        today > discount.endDate ||
        discount.usedCount >= discount.usageLimit) {
        return res.status(400).json({
            message: "Discount is expired or usage limit reached"
        });
    }

    if (discount.scope === "Products") {
        return res.status(400).json({
            message: "This discount is not applicable to subscriptions"
        });
    }

    const total = subscription.amount * subscription.quantity;

    if (total < discount.minPurchase ||
        subscription.quantity < discount.minQuantity) {
        return res.status(400).json({
            message: "Minimum purchase or quantity not satisfied"
        });
    }

    const discountAmount =
        discount.type === "Percentage"
            ? total * discount.value / 100
            : discount.value;

    if (discountAmount > total) {
        return res.status(400).json({
            message: "Discount cannot exceed subscription amount"
        });
    }

    subscription.discountAmount = discountAmount;
    subscription.discountId = discount.id;
    subscription.finalAmount = total - discountAmount;

    discount.usedCount++;

    res.json({
        message: "Discount applied successfully",
        originalAmount: total,
        discountAmount,
        finalAmount: subscription.finalAmount
    });
});

module.exports = router;