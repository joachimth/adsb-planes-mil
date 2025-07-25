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
        
        // Når data er hentet, bygger vi tabellen og initialiserer filter-sættet.
        populateSquawkTable(squawkData);
        initializeSquawkSet(squawkData);

        // Fortæl hovedprogrammet, at det er tid til at opdatere,
        // da vi nu har indlæst standard-squawks.
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
        // Tilføj en overskrift-række for hver kategori.
        html += `
            <tr class="category-header">
                <td colspan="3">${category.name}</td>
            </tr>
        `;
        // Tilføj en række for hver kode i kategorien.
        category.codes.forEach(entry => {
            const isChecked = entry.checked ? 'checked' : '';
            const isDisabled = entry.disabled ? 'disabled' : '';
            html += `
                <tr>
                    <td>${entry.code}</td>
                    <td>${entry.description}</td>
                    <td><input type="checkbox" data-squawk="${entry.code}" ${isChecked} ${isDisabled}></td>
                </tr>
            `;
        });
    });
    tableBody.innerHTML = html;

    // Sæt en enkelt, effektiv event listener på hele tabellen.
    tableBody.addEventListener('change', handleCheckboxChange);
}

/**
 * Initialiserer det globale sæt af valgte squawks baseret på standardvalg.
 * @param {object} squawkData - Data hentet fra squawk_codes.json.
 */
function initializeSquawkSet(squawkData) {
    // Sørg for at det globale sæt eksisterer.
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
    // Tjek om det, der blev ændret, rent faktisk var en checkbox.
    if (event.target.type === 'checkbox') {
        const squawk = event.target.dataset.squawk;
        
        if (event.target.checked) {
            window.userSelectedSquawks.add(squawk);
        } else {
            window.userSelectedSquawks.delete(squawk);
        }

        // Kald den centrale opdateringsfunktion for at anvende ALLE filtre.
        if (typeof window.applyFiltersAndUpdate === "function") {
            window.applyFiltersAndUpdate();
        }
    }
}