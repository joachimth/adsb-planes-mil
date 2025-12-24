/**
 * Squawk Code Lookup Module - MilAir Watch
 * Håndterer opslag af squawk kode beskrivelser
 */

console.log("✅ squawk-lookup.js er indlæst.");

let squawkDatabase = null;

/**
 * Load squawk codes database
 */
export async function loadSquawkCodes() {
    if (squawkDatabase) return squawkDatabase;

    try {
        const response = await fetch('squawk_codes.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        squawkDatabase = data;
        console.log("✅ Squawk koder database indlæst");
        return data;
    } catch (error) {
        console.error("❌ Fejl ved indlæsning af squawk koder:", error);
        return null;
    }
}

/**
 * Get description for a squawk code
 * @param {string} squawk - The squawk code (e.g., "7700", "4450")
 * @returns {string|null} - Description or null if not found
 */
export function getSquawkDescription(squawk) {
    if (!squawkDatabase || !squawk) return null;

    const squawkNum = parseInt(squawk, 10);

    // Iterate through all categories
    for (const category of squawkDatabase.categories) {
        for (const codeEntry of category.codes) {
            // Check for direct match
            if (codeEntry.code === squawk) {
                return codeEntry.description;
            }

            // Check for range match (e.g., "4400-4477")
            if (codeEntry.code.includes('-')) {
                const [start, end] = codeEntry.code.split('-').map(Number);
                if (!isNaN(squawkNum) && squawkNum >= start && squawkNum <= end) {
                    return codeEntry.description;
                }
            }
        }
    }

    return null;
}

/**
 * Get category name for a squawk code
 * @param {string} squawk - The squawk code
 * @returns {string|null} - Category name or null
 */
export function getSquawkCategory(squawk) {
    if (!squawkDatabase || !squawk) return null;

    const squawkNum = parseInt(squawk, 10);

    for (const category of squawkDatabase.categories) {
        for (const codeEntry of category.codes) {
            // Direct match
            if (codeEntry.code === squawk) {
                return category.name;
            }

            // Range match
            if (codeEntry.code.includes('-')) {
                const [start, end] = codeEntry.code.split('-').map(Number);
                if (!isNaN(squawkNum) && squawkNum >= start && squawkNum <= end) {
                    return category.name;
                }
            }
        }
    }

    return null;
}

/**
 * Get full info for a squawk code
 * @param {string} squawk - The squawk code
 * @returns {Object|null} - { description, category, code } or null
 */
export function getSquawkInfo(squawk) {
    if (!squawkDatabase || !squawk) return null;

    const description = getSquawkDescription(squawk);
    const category = getSquawkCategory(squawk);

    if (description || category) {
        return {
            code: squawk,
            description: description || 'Ukendt kode',
            category: category || 'Anden'
        };
    }

    return null;
}
