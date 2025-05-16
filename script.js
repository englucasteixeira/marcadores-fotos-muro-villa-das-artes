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

        // Definindo o centro fixo e o zoom inicial
        const centerPosition = {
            lat: -19.624477, // Latitude do centro desejado
            lng: -46.915253  // Longitude do centro desejado
        };

        map = new Map(mapDiv, {
            center: centerPosition,
            zoom: 17, // Zoom mais aproximado (valor entre 15-18 é bom para visualização de bairros/quarteirões)
            mapId: "VILLA_DAS_ARTES",
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

        // Constante para definir o raio máximo em metros para exibir marcadores
        const MAX_DISTANCE_RADIUS = 1000; // 1km em metros

        if (marcadoresInfo.length === 0) {
            console.warn("Nenhum marcador para exibir. O mapa permanecerá na visualização definida pelas coordenadas fornecidas.");
        } else {
            marcadoresInfo.forEach((markerData, index) => {
                // Validação básica das coordenadas
                if (!markerData.position || typeof markerData.position.lat !== 'number' || typeof markerData.position.lng !== 'number') {
                    console.warn(`Marcador ${index} ('${markerData.name}') tem dados de posição inválidos ou ausentes. Ignorando.`, markerData);
                    return;
                }
                if (markerData.position.lat < -90 || markerData.position.lat > 90 || markerData.position.lng < -180 || markerData.position.lng > 180) {
                    console.warn(`Marcador ${index} ('${markerData.name}') tem coordenadas lat/lng fora do intervalo válido. Ignorando.`, markerData);
                    return;
                }
                
                // Calcula a distância do marcador ao centro do mapa
                const markerPos = new google.maps.LatLng(markerData.position.lat, markerData.position.lng);
                const centerPos = new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng());
                
                // Função nativa de haversine para calcular distância aproximada em metros
                // Podemos usar math diretamente para evitar dependência da biblioteca geometry
                const distance = calculateDistance(
                    map.getCenter().lat(), map.getCenter().lng(),
                    markerData.position.lat, markerData.position.lng
                );
                
                // Se o marcador estiver fora do raio definido, não mostra
                if (distance > MAX_DISTANCE_RADIUS) {
                    console.info(`Marcador '${markerData.name}' está a ${distance.toFixed(0)}m do centro, fora do raio de ${MAX_DISTANCE_RADIUS}m. Não será exibido.`);
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
        }

    } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
        if (mapDiv) {
            mapDiv.innerHTML = `<p style='text-align:center; padding: 20px; color: red;'>Ocorreu um erro ao carregar o mapa: ${error.message}. Verifique o console para mais detalhes.</p>`;
        }
    }
}

// Função para calcular distância entre dois pontos geográficos (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raio da Terra em metros
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// Função auxiliar para converter graus para radianos
function toRad(degrees) {
    return degrees * Math.PI / 180;
}

window.initMap = initMap;

window.gm_authFailure = function() {
    console.error('Erro de autenticação na API do Google Maps.');
    const mapDiv = document.getElementById("map");
    if (mapDiv) {
        mapDiv.innerHTML = "<p style='text-align:center; padding: 20px; color: red;'>Erro de autenticação com a API do Google Maps. Verifique sua chave de API e configurações.</p>";
    }
};