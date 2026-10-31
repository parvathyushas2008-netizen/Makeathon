const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Member 3 routes
const member3Routes = require("./routes/member3Routes");

app.use("/api/member3", member3Routes);

app.get("/", (req, res) => {
    res.send("Subscription Management Server Running");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});