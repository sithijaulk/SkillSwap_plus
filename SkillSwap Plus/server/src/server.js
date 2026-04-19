const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');
const net = require('net');
const http = require('http');
const { initializeMeetingGateway } = require('./realtime/meeting.gateway');

/**
 * ===========================
 * START SERVER
 * ===========================
 */

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start listening
        const preferredPort = Number(config.PORT) || 5000;
        const maxPortAttempts = 10;

        const findAvailablePort = (startPort, attemptsRemaining) => new Promise((resolve, reject) => {
            if (attemptsRemaining <= 0) {
                return reject(new Error(`No available port found from ${startPort} to ${startPort + maxPortAttempts - 1}`));
            }

            const tester = net.createServer();

            tester.once('error', (err) => {
                tester.close(() => {});

                if (err.code === 'EADDRINUSE') {
                    return resolve(findAvailablePort(startPort + 1, attemptsRemaining - 1));
                }

                return reject(err);
            });

            tester.once('listening', () => {
                tester.close(() => resolve(startPort));
            });

            tester.listen(startPort, '::');
        });

        const PORT = await findAvailablePort(preferredPort, maxPortAttempts);

        if (PORT !== preferredPort) {
            console.warn(`⚠️ Preferred port ${preferredPort} is busy. Using port ${PORT} instead.`);
        }

        const httpServer = http.createServer(app);
        initializeMeetingGateway(httpServer);

        httpServer.listen(PORT, () => {
            console.log(`\n🚀 Server running in ${config.NODE_ENV} mode on port ${PORT}`);
            console.log(`📍 API: http://localhost:${PORT}`);
            console.log(`🏥 Health: http://localhost:${PORT}/health`);
            console.log(`🎥 Meeting Socket: ws://localhost:${PORT}`);
            console.log(`\nPress CTRL+C to stop\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();
