// script.js

let map;
let markers = [];
let infoWindows = [];

// Defina as cores para cada categoria
const categoryColors = {
    "Armadura exposta": "#FF5733",               // Laranja Avermelhado
    "Bolhas e porosidade": "#006400",            // Verde Escuro
    "Carvão em peça pré-fabricada": "#581845",   // Roxo Escuro
    "Danos em peças": "#FFC300",                 // Amarelo/Ouro
    "Desencaixe de peças": "#C70039",            // Vermelho Escuro
    "Peças com agregados expostos": "#337AFF",   // Azul
};
const defaultMarkerColor = "#808080";

async function initMap() {
    const mapDiv = document.getElementById("map");

    try {
        if (typeof marcadoresInfo === 'undefined' || !Array.isArray(marcadoresInfo)) {
            console.error("Os dados dos marcadores (marcadoresInfo) não foram encontrados ou não estão no formato esperado.");
            if (mapDiv) {
                mapDiv.innerHTML = "<p style='text-align:center; padding: 20px; color: red;'>Erro: Dados dos marcadores (marcadoresInfo) não disponíveis ou malformatados.</p>";
            }
            return;
        }

        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

        // Coordenadas para definir a área inicial e o centro
        const coord1 = { lat: -19.621287, lng: -46.916292 };
        const coord2 = { lat: -19.628137, lng: -46.913248 };

        // Calcular o centro da diagonal
        const centerLat = (coord1.lat + coord2.lat) / 2;
        const centerLng = (coord1.lng + coord2.lng) / 2;
        const calculatedMapCenter = { lat: centerLat, lng: centerLng };

        map = new Map(mapDiv, {
            center: calculatedMapCenter, // O centro será ajustado pelo fitBounds abaixo, mas é bom ter um inicial
            zoom: 17, // Um zoom inicial razoável, será ajustado por fitBounds
            mapId: "MEU_MAPA_ID_PERSONALIZADO",
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_RIGHT,
                mapTypeIds: [
                    google.maps.MapTypeId.ROADMAP,
                    google.maps.MapTypeId.SATELLITE,
                    google.maps.MapTypeId.HYBRID,
                    google.maps.MapTypeId.TERRAIN
                ]
            },
            mapTypeId: google.maps.MapTypeId.SATELLITE, // Iniciar com a camada de satélite
        });

        // Definir os limites iniciais com base nas coordenadas fornecidas
        const initialBounds = new google.maps.LatLngBounds();
        initialBounds.extend(new google.maps.LatLng(coord1.lat, coord1.lng));
        initialBounds.extend(new google.maps.LatLng(coord2.lat, coord2.lng));

        // Ajustar o mapa para esses limites iniciais
        // Isso definirá o centro e o zoom para englobar a área das duas coordenadas
        map.fitBounds(initialBounds);

        // Bounds para os marcadores (se houver)
        const markerBounds = new google.maps.LatLngBounds();
        let validMarkersCount = 0;

        if (marcadoresInfo.length === 0) {
            console.warn("Nenhum marcador para exibir. O mapa permanecerá na visualização definida pelas coordenadas fornecidas.");
        } else {
            marcadoresInfo.forEach((markerData, index) => {
                if (!markerData.position || typeof markerData.position.lat !== 'number' || typeof markerData.position.lng !== 'number') {
                    console.warn(`Marcador ${index} ('${markerData.name}') tem dados de posição inválidos ou ausentes. Ignorando.`, markerData);
                    return;
                }
                if (markerData.position.lat < -90 || markerData.position.lat > 90 || markerData.position.lng < -180 || markerData.position.lng > 180) {
                    console.warn(`Marcador ${index} ('${markerData.name}') tem coordenadas lat/lng fora do intervalo válido. Ignorando.`, markerData);
                    return;
                }

                const markerColor = categoryColors[markerData.categoria] || defaultMarkerColor;

                const pin = new PinElement({
                    background: markerColor,
                    borderColor: "#000000",
                    glyphColor: "#FFFFFF",
                    scale: 0.85,
                });

                const marker = new AdvancedMarkerElement({
                    map: map,
                    position: markerData.position,
                    title: `${markerData.name}`,
                    content: pin.element,
                });

                markerBounds.extend(markerData.position); // Adiciona a posição do marcador aos bounds dos marcadores
                validMarkersCount++;

                let infoWindowContent = `
                    <div class="custom-infowindow" style="max-width: 300px; font-family: Arial, sans-serif;">
                        <h4 style="margin-top:0; margin-bottom:8px; color: ${markerColor};">${markerData.name}</h4>`;

                if (markerData.imageFile) {
                    const imagePath = `imagens_muro/${markerData.imageFile}`;
                    infoWindowContent += `
                        <div style="margin: 10px 0;">
                            <img src="${imagePath}" alt="${markerData.name}" style="width:100%; max-height:200px; object-fit:cover; border-radius: 4px; border: 1px solid #ccc;">
                        </div>`;
                }
                infoWindowContent += `</div>`;

                const infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent,
                });

                marker.addListener("click", () => {
                    infoWindows.forEach(iw => iw.close());
                    infoWindow.open({
                        anchor: marker,
                        map: map,
                    });
                });

                markers.push(marker);
                infoWindows.push(infoWindow);
            });

            if (validMarkersCount === 0) {
                console.warn("Nenhum marcador válido para exibir após filtragem. O mapa permanecerá na visualização definida pelas coordenadas fornecidas.");
                // O mapa já está ajustado para initialBounds, então não precisamos fazer nada aqui.
            } else {
                // Se houver marcadores válidos, ajuste o mapa para incluir todos eles.
                // Isso pode fazer o mapa dar zoom out se os marcadores estiverem fora dos initialBounds,
                // ou zoom in se estiverem todos contidos e mais próximos.
                map.fitBounds(markerBounds, 50); // O 50 é um padding
            }
        }

    } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
        if (mapDiv) {
            mapDiv.innerHTML = `<p style='text-align:center; padding: 20px; color: red;'>Ocorreu um erro ao carregar o mapa: ${error.message}. Verifique o console para mais detalhes.</p>`;
        }
    }
}

window.initMap = initMap;

window.gm_authFailure = function() {
    console.error('Erro de autenticação na API do Google Maps.');
    const mapDiv = document.getElementById("map");
    if (mapDiv) {
        mapDiv.innerHTML = "<p style='text-align:center; padding: 20px; color: red;'>Erro de autenticação com a API do Google Maps. Verifique sua chave de API e configurações.</p>";
    }
};