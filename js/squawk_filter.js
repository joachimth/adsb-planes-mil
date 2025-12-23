/**
 * Squawk-filter modul
 * Håndterer filtrering baseret på squawk-koder
 */

console.log("✅ squawk_filter.js er indlæst.");

/**
 * Initialiserer squawk-filteret
 * @param {Function} onFilterChange - Callback når filteret ændres
 * @param {Set} userSelectedSquawks - Reference til det globale squawk-sæt
 */
export async function initializeSquawkFilter(onFilterChange, userSelectedSquawks) {
    try {
        const response = await fetch('squawk_codes.json');

        if (!response.ok) {
            throw new Error(`HTTP fejl! Status: ${response.status}`);
        }

        const squawkData = await response.json();

        populateSquawkTable(squawkData, onFilterChange, userSelectedSquawks);
        initializeSquawkSet(squawkData, userSelectedSquawks);

        console.log("✅ Squawk-filter initialiseret.");

        // Trigger initial filter update
        if (typeof onFilterChange === 'function') {
            onFilterChange();
        }

    } catch (error) {
        console.error("❌ Fejl ved indlæsning af squawk_codes.json:", error);
        throw error;
    }
}

/**
 * Bygger squawk-filter tabellen
 */
function populateSquawkTable(squawkData, onFilterChange, userSelectedSquawks) {
    const tableBody = document.getElementById('squawkTableBody');

    if (!tableBody) {
        console.error("❌ #squawkTableBody blev ikke fundet.");
        return;
    }

    let html = '';

    squawkData.categories.forEach(category => {
        // Kategori-header
        html += `
            <tr class="category-header">
                <td colspan="2">${category.name}</td>
            </tr>
        `;

        // Squawk-koder i kategorien
        category.codes.forEach(entry => {
            const isChecked = entry.checked ? 'checked' : '';
            const isDisabled = entry.disabled ? 'disabled' : '';
            const descriptionHtml = entry.description
                ? `<div class="description">${entry.description}</div>`
                : '';

            html += `
                <tr>
                    <td>
                        <input
                            type="checkbox"
                            data-squawk="${entry.code}"
                            ${isChecked}
                            ${isDisabled}
                            aria-label="Vælg ${entry.code}"
                        >
                    </td>
                    <td>
                        <div class="code">${entry.code}</div>
                        ${descriptionHtml}
                    </td>
                </tr>
            `;
        });
    });

    tableBody.innerHTML = html;

    // Tilføj event listener for checkbox changes
    tableBody.addEventListener('change', (event) => {
        handleCheckboxChange(event, onFilterChange, userSelectedSquawks);
    });
}

/**
 * Initialiserer squawk-sættet med default-værdier
 */
function initializeSquawkSet(squawkData, userSelectedSquawks) {
    if (!userSelectedSquawks) {
        console.error("❌ userSelectedSquawks er ikke defineret.");
        return;
    }

    squawkData.categories.forEach(category => {
        category.codes.forEach(entry => {
            if (entry.checked) {
                userSelectedSquawks.add(entry.code);
            }
        });
    });
}

/**
 * Håndterer checkbox ændringer
 */
function handleCheckboxChange(event, onFilterChange, userSelectedSquawks) {
    if (event.target.type !== 'checkbox') return;

    const squawk = event.target.dataset.squawk;

    if (event.target.checked) {
        userSelectedSquawks.add(squawk);
    } else {
        userSelectedSquawks.delete(squawk);
    }

    // Trigger filter update
    if (typeof onFilterChange === 'function') {
        onFilterChange();
    }
}
