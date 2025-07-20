const axios = require("axios");
const crypto = require("crypto");
const Whitelist = require("../models/Whitelist.js");

const MUVIIN_API_URL = "https://api.muviin.co/api/src/controllers/dev/index.php";
const MUVIIN_API_KEY = "b0c566ea8c733da2afac09ffc31a3d7bab4e67fa3e633608dce69b9b26528aac";

const initiateBundle = async (req, res) => {

    const {
        network,
        bundle,
        amount,
        number,
        fundsource,
        selectedFSNetwork,
    } = req.body;
    if (!network || !bundle || !amount || !number || !fundsource || !selectedFSNetwork) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    // Generate a unique external reference
    const extref = `vbundle_${crypto.randomUUID()}`;
    const formattedNumber = formatNumber(number);

    // Check if the number is whitelisted
    const isWhitelisted = await Whitelist.findOne({ phone: formattedNumber });
    if (!isWhitelisted) {
        return res.status(400).json({
            error: "Receiver is not eligible for data purchases. Number not whitelisted."
        });
    }
    const formatNumber = (num) => {
        if (num.startsWith('0')) return '233' + num.slice(1);
        return num;
    };

    const payload = {
        type: 1,
        function: "data-init",
        network,
        bundle,
        amount,
        number: formatNumber(number),
        fundsource: formatNumber(fundsource),
        selectedFSNetwork,
        extref,
    };

    console.log("📤 Payload to Muviin:", payload);

    try {
        const response = await axios.post(MUVIIN_API_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "Apikey": MUVIIN_API_KEY,
            },
        });

        return res.status(200).json({
            message: "Muviin payment initiated successfully",
            data: response.data,
        });
    } catch (err) {
        if (err.response) {
            console.error("🔴 Muviin API Error:", err.response.data);
            return res.status(err.response.status).json({
                error: "Muviin rejected the request",
                detail: err.response.data,
            });
        }
    }
};

module.exports = { initiateBundle };
