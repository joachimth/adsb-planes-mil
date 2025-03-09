let userSelectedSquawks = new Set();

async function loadSquawkCodes() {
    try {
        console.log("🔄 Forsøger at hente squawk_codes.json...");
        const response = await fetch('squawk_codes.json');
        
        if (!response.ok) {
            throw new Error(`HTTP-fejl! Status: ${response.status}`);
        }
        
        const squawkData = await response.json();
        console.log("✅ Squawk-koder indlæst:", squawkData);
        populateSquawkTable(squawkData);
    } catch (error) {
        console.error("❌ Fejl ved indlæsning af squawk-koder:", error);
    }
}

function populateSquawkTable(squawkData) {
    const tableBody = document.getElementById('squawkTableBody');
    if (!tableBody) {
        console.error("❌ FEJL: squawkTableBody ikke fundet i DOM'en!");
        return;
    }
    
    tableBody.innerHTML = '';
    
    const allSquawks = [...(squawkData.international || []), ...(squawkData.national_usa || []), ...(squawkData.military || [])];
    
    if (allSquawks.length === 0) {
        console.warn("⚠️ Ingen squawk-koder blev fundet i JSON-filen!");
    }
    
    allSquawks.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.code}</td>
            <td>${entry.description}</td>
            <td><input type="checkbox" data-squawk="${entry.code}"></td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('#squawkTable input[type=checkbox]').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const squawk = event.target.dataset.squawk;
            if (event.target.checked) {
                userSelectedSquawks.add(squawk);
            } else {
                userSelectedSquawks.delete(squawk);
            }
            updateFlightTable(globalFlightData);
        });
    });
}

document.addEventListener("DOMContentLoaded", loadSquawkCodes);
