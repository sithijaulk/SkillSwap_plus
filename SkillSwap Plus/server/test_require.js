try {
    console.log('--- Require Test ---');
    console.log('CWD:', process.cwd());
    console.log('Requiring ./src/app...');
    const app = require('./src/app');
    console.log('✅ App required successfully!');
} catch (e) {
    console.error('❌ Failed to require app:');
    console.error(e);
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('Search stack:', e.stack);
    }
}
