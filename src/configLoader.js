import fs from 'fs';

class ConfigLoader {
    static config = null;

    static loadConfig(filePath = 'config.json') {
        if (this.config === null) {
            const data = fs.readFileSync(filePath, 'utf8');
            this.config = JSON.parse(data);
        }
        return this.config;
    }
}

// Export the class
export default ConfigLoader;