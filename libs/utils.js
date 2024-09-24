async function loadCore() {
    try {
        const data = await fs.readFile(corePath, 'utf8');
        global.core = JSON.parse(data);
        console.log('Core Loaded');
    } catch (err) {
        console.error('Error reading core.json:', err);
    }
}

async function setOwner(number) {
    console.log(`Setting owner to number: ${number}`);
    try {
        await global.owner(number);   
        console.log('Owner set successfully.');
    } catch (error) {
        console.error("Error adding owner: ", error);
    }
}

async function toggleNSFW(enable) {
    try {
        const data = await fs.readFile(corePath, 'utf8');
        const jsonData = JSON.parse(data);

        if (jsonData.hasOwnProperty('nsfw')) {
            if (enable && jsonData.nsfw === false) {
                jsonData.nsfw = true;
                await fs.writeFile(corePath, JSON.stringify(jsonData, null, 2), 'utf8');
                loadCore();
                return "NSFW mode is now enabled.";
            } else if (!enable && jsonData.nsfw === true) {
                jsonData.nsfw = false;
                await fs.writeFile(corePath, JSON.stringify(jsonData, null, 2), 'utf8');
                loadCore();
                return "NSFW mode is now disabled.";
            } else {
                return `NSFW mode is already ${enable ? "enabled" : "disabled"}.`;
            }
        }
    } catch (err) {
        console.error(`Error ${enable ? "enabling" : "disabling"} NSFW:`, err);
        return `An error occurred while trying to ${enable ? "enable" : "disable"} NSFW mode.`;
    }
}

module.exports = {
    toggleNSFW, loadCore, setOwner
}