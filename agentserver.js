// agentserver.js

import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';

const app = express();
const PORT = 8002;

app.use(cors());
app.use(express.json());

app.get('/api/usps_login', (req, res) => {
    console.log("Request received at /api/usps_login, invoking agent1.py...");

    // Execute agent1.py as a standalone script
    execFile('python', ['agent1.py'], (error, stdout, stderr) => {
        if (error) {
            console.error("Error executing agent1.py:", stderr);
            res.status(500).json({ error: "Error executing agent1.py" });
            return;
        }

        try {
            // Parse the JSON output from agent1.py
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (parseError) {
            console.error("Error parsing JSON from agent1.py output:", parseError);
            res.status(500).json({ error: "Error parsing response from agent1.py" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Agent Server is running on port ${PORT}`);
});
