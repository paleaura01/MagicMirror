import https from 'https';
import fs from 'fs';

class MoonPhaseServer {
    constructor() {
        this.outputFile = 'data/moonPhases.json';
        this.apiUrl = 'https://moon-phase.p.rapidapi.com/advanced';
        this.apiHost = 'moon-phase.p.rapidapi.com';
        this.apiKey = '28c0c4e132msh9a5550c52e27bc5p1fff71jsn11376b42e7fa';
    }

    async getMoonPhase() {
        const options = {
            headers: {
                'x-rapidapi-host': this.apiHost,
                'x-rapidapi-key': this.apiKey
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.get(this.apiUrl, options, (resp) => {
                if (resp.statusCode !== 200) {
                    console.error(`API returned status code ${resp.statusCode}: ${resp.statusMessage}`);
                    reject(new Error(`API returned status code ${resp.statusCode}: ${resp.statusMessage}`));
                    return;
                }

                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });

                resp.on('end', () => {
                    try {
                        console.log('Raw API response:', data); // Log raw response

                        const moonData = JSON.parse(data); // Parse JSON
                        const phaseData = {
                            timestamp: moonData.timestamp,
                            datestamp: moonData.datestamp,
                            phase: moonData.moon.phase,
                            illumination: moonData.moon.illumination,
                            age_days: moonData.moon.age_days,
                            lunar_cycle: moonData.moon.lunar_cycle,
                            phase_name: moonData.moon.phase_name,
                            stage: moonData.moon.stage,
                            emoji: moonData.moon.emoji,
                            zodiac_sign: moonData.moon.zodiac_sign,
                            moonrise: moonData.moon.moonrise,
                            moonset: moonData.moon.moonset,
                            moon_altitude: moonData.moon.moon_altitude,
                            moon_distance: moonData.moon.moon_distance,
                            moon_azimuth: moonData.moon.moon_azimuth,
                            sun: moonData.sun,
                            moon_phases: moonData.moon_phases,
                            lastUpdated: new Date().toISOString()
                        };
                        resolve(phaseData);
                    } catch (error) {
                        console.error('Failed to process API response:', data); // Log raw response
                        reject(new Error(`Failed to process API response: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Network error:', error.message);
                reject(new Error(`Network error: ${error.message}`));
            });
        });
    }

    async updatePhaseData() {
        try {
            const moonData = await this.getMoonPhase();
            fs.writeFileSync(this.outputFile, JSON.stringify(moonData, null, 2));
            console.log(`Moon phase data updated at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('Error updating moon phase data:', error);
        }
    }

    start() {
        // Update immediately on start
        this.updatePhaseData();

        // Calculate time until next midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const timeUntilMidnight = tomorrow - now;

        // Schedule first update at next midnight
        setTimeout(() => {
            this.updatePhaseData();
            // Then schedule daily updates
            setInterval(() => {
                this.updatePhaseData();
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, timeUntilMidnight);

        console.log('Moon phase server started');
    }
}

// Create and start the server
const moonPhaseServer = new MoonPhaseServer();
moonPhaseServer.start();
