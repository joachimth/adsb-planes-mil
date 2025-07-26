console.log("✅ squawk_filter.js er indlæst.");

/**
 * Initialiserer squawk-filter sektionen.
 * Henter koder fra JSON og sætter event listeners op.
 * Gøres global, så den kan kaldes fra index.html.
 */
window.initializeSquawkFilter = async function() {
    try {
        const response = await fetch('squawk_codes.json');
        if (!response.ok) {
            throw new Error(`HTTP fejl! Status: ${response.status}`);
        }
        const squawkData = await response.json();
        
        populateSquawkTable(squawkData);
        initializeSquawkSet(squawkData);

        if (typeof window.applyFiltersAndUpdate === "function") {
            window.applyFiltersAndUpdate();
        }

    } catch (error) {
        console.error("❌ Fejl ved indlæsning af squawk_codes.json:", error);
    }
};

/**
 * Bygger HTML-tabellen med squawk-koder baseret på JSON-data.
 * @param {object} squawkData - Data hentet fra squawk_codes.json.
 */
function populateSquawkTable(squawkData) {
    const tableBody = document.getElementById('squawkTableBody');
    if (!tableBody) {
        console.error("❌ Fejl: #squawkTableBody blev ikke fundet.");
        return;
    }

    let html = "";
    squawkData.categories.forEach(category => {
        html += `
            <tr class="category-header">
                <td colspan="2">${category.name}</td>
            </tr>
        `;
        
        // --- VIGTIG ÆNDRING HER ---
        // Vi ændrer HTML-strukturen for hver række for at få bedre kontrol med CSS.
        category.codes.forEach(entry => {
            const isChecked = entry.checked ? 'checked' : '';
            const isDisabled = entry.disabled ? 'disabled' : '';
            
            // Tjek om der er en beskrivelse. Hvis ikke, er div'en tom.
            const descriptionHtml = entry.description ? `<div class="description">${entry.description}</div>` : '';

            html += `
                <tr>
                    <!-- Celle 1: Afkrydsningsfelt -->
                    <td><input type="checkbox" data-squawk="${entry.code}" ${isChecked} ${isDisabled}></td>
                    
                    <!-- Celle 2: Alt tekst-indhold -->
                    <td>
                        <div class="code">${entry.code}</div>
                        ${descriptionHtml}
                    </td>
                </tr>
            `;
        });
    });
    tableBody.innerHTML = html;

    tableBody.addEventListener('change', handleCheckboxChange);
}

/**
 * Initialiserer det globale sæt af valgte squawks baseret på standardvalg.
 * @param {object} squawkData - Data hentet fra squawk_codes.json.
 */
function initializeSquawkSet(squawkData) {
    if (!window.userSelectedSquawks) {
        window.userSelectedSquawks = new Set();
    }
    
    squawkData.categories.forEach(category => {
        category.codes.forEach(entry => {
            if (entry.checked) {
                window.userSelectedSquawks.add(entry.code);
            }
        });
    });
}

/**
 * Håndterer klik på en checkbox.
 * @param {Event} event - Den 'change' event, der blev udløst.
 */
function handleCheckboxChange(event) {
    if (event.target.type === 'checkbox') {
        const squawk = event.target.dataset.squawk;
        
        if (event.target.checked) {
            window.userSelectedSquawks.add(squawk);
        } else {
            window.userSelectedSquawks.delete(squawk);
        }

        if (typeof window.applyFiltersAndUpdate === "function") {
            window.applyFiltersAndUpdate();
        }
    }
}