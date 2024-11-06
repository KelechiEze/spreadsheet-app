// Import required modules using ES module syntax
import express from "express";
import { google } from "googleapis";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Setup to handle `__dirname` in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Allow requests from other origins
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// Define pricing structure
const prices = {
    office: 100,
    private: 200,
    conference: 150,
    virtualOffice: 50,
    dedicatedDesk: 75,
    trainingHall: 120,
    coworkingSpace: 90,
};

// Google Sheets configuration
const spreadsheetId = "1ERSU5Tk6Pf6O8HmnjqlYIR66N1mOzzzp4ACxhJ2aCvo"; // Replace with your spreadsheet ID

// Utility function to format dates from DD-MM-YYYY to YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return "";
    const [day, month, year] = date.split("-");
    return `${year}-${month}-${day}`;
};

// Endpoint to handle form submission
app.post("/api/submit", async (req, res) => {
    console.log("Data received:", req.body); // Log incoming data for debugging

    let { name, email, phone, service, startDate, endDate, price, transactionId } = req.body;

    // Ensure dates are formatted correctly
    startDate = formatDate(startDate);
    endDate = formatDate(endDate);

    try {
        // Initialize Google Auth
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, "Credentials.json"), // Use path for compatibility
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        // Create client instance for auth
        const client = await auth.getClient();

        // Instance for Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });

        // Append a new row to the spreadsheet with all form data
        const response = await googleSheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Sheet1!A:I", // Adjusted range to include an additional column for transaction ID
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [
                    [name, email, phone, service, startDate, endDate, price, transactionId],
                ],
            },
        });

        console.log("Data successfully appended to the spreadsheet:", response.data);
        res.send("Successfully submitted! Thank you.");
    } catch (error) {
        console.error("Error appending data to the spreadsheet:", error);
        res.status(500).send("An error occurred while submitting your request.");
    }
});

// Flutterwave webhook endpoint
app.post("/api/webhook/flutterwave", async (req, res) => {
    const secretHash = "CA7VN4LFTGRZSBE2"; // Replace with your actual secret hash

    // Validate the request signature
    const signature = req.headers["verif-hash"];
    if (!signature || signature !== secretHash) {
        console.log("Invalid or missing Flutterwave signature.");
        return res.status(403).send("Forbidden");
    }

    const { event, data } = req.body;

    // Only process successful payment events
    if (event === "charge.completed" && data.status === "successful") {
        const { customer, tx_ref, amount, created_at } = data;
        const name = customer.name || "N/A";
        const email = customer.email;
        const phone = customer.phone_number || "N/A";
        const transactionId = tx_ref;
        const price = amount;
        const startDate = formatDate(new Date(created_at).toLocaleDateString("en-GB"));
        const endDate = ""; // Adjust if needed or calculate based on your requirements
        const service = ""; // Add your service identifier if available

        try {
            // Initialize Google Auth
            const auth = new google.auth.GoogleAuth({
                keyFile: path.join(__dirname, "Credentials.json"),
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });

            // Create client instance for auth
            const client = await auth.getClient();

            // Instance for Google Sheets API
            const googleSheets = google.sheets({ version: "v4", auth: client });

            // Append a new row to the spreadsheet with payment data
            const response = await googleSheets.spreadsheets.values.append({
                spreadsheetId,
                range: "Sheet1!A:I",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [
                        [name, email, phone, service, startDate, endDate, price, transactionId],
                    ],
                },
            });

            console.log("Payment data successfully appended to the spreadsheet:", response.data);
            res.sendStatus(200);
        } catch (error) {
            console.error("Error appending payment data to the spreadsheet:", error);
            res.status(500).send("Error processing webhook data.");
        }
    } else {
        console.log("Non-successful payment event or irrelevant event received:", event);
        res.sendStatus(200); // Acknowledge other events or unsuccessful payments without processing
    }
});

// Start the Express server
const PORT = 1337;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
