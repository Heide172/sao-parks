<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import L from 'leaflet';
	import type { Polygon as GeoJSONPolygon, MultiPolygon as GeoJSONMultiPolygon } from 'geojson';
	import 'leaflet/dist/leaflet.css';
	import 'leaflet-draw/dist/leaflet.draw.css';
	import 'leaflet-draw';
	import 'leaflet.markercluster/dist/MarkerCluster.css';
	import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
	import 'leaflet.markercluster';
	import { FACILITY_TYPES, FACILITY_ICONS } from '$lib/constants';

	type Geometry = GeoJSONPolygon | GeoJSONMultiPolygon;

	type District = {
		id: number;
		name: string;
		geometry: Geometry;
		area?: number;
	};

	type Park = {
		id: number;
		name: string;
		districtId: number | null;
		geometry: Geometry;
		area?: number;
		balanceHolder?: string;
		description?: string;
	};

	type Facility = {
		id: number;
		name: string;
		type: string;
		latitude: number;
		longitude: number;
		parkId: number;
		photo?: string;
		description?: string;
		contractAction?: string;
		contractWith?: string;
		contractTerm?: string;
		area?: number;
		surfaceType?: string;
		mafCount?: number;
	};

	let {
		parks = $bindable([]),
		facilities = $bindable([]),
		districts = $bindable([]),
		isAdmin = false,
		onDistrictCreate,
		onParkCreate,
		onFacilityCreate
	}: {
		parks?: Park[];
		facilities?: Facility[];
		districts?: District[];
		isAdmin?: boolean;
		onDistrictCreate?: (geometry: Geometry) => void;
		onParkCreate?: (geometry: Geometry) => void;
		onFacilityCreate?: (lat: number, lng: number) => void;
	} = $props();

	let mapContainer: HTMLDivElement;
	let map: L.Map;
	let drawnItems: L.FeatureGroup;
	let districtLayer: L.FeatureGroup;
	let markerClusterGroup: L.MarkerClusterGroup;
	let drawControl: L.Control.Draw;
	let activeDrawHandler: L.Draw.Polygon | null = null;

	let isDrawingDistrict = $state(false);
	let isDrawingPark = $state(false);
	let isPlacingFacility = $state(false);

	// Modal state for image viewer
	let modalImageUrl = $state<string | null>(null);
	let showImageModal = $state(false);

	// Filter state - simple boolean objects
	let showFilterPanel = $state(false);
	let hiddenDistricts = $state<Record<number, boolean>>({});
	let hiddenParks = $state<Record<number, boolean>>({});
	let hiddenFacilityTypes = $state<Record<string, boolean>>({});

	// Helper function to format numbers with thousand separators
	function formatNumber(num: number, decimals: number = 2): string {
		return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	}

	// Helper functions to check visibility
	function isDistrictVisible(id: number) {
		return !hiddenDistricts[id];
	}

	function isParkVisible(id: number) {
		const park = parks.find((p) => p.id === id);
		// Hide if park is hidden OR its district is hidden
		if (hiddenParks[id]) return false;
		if (park?.districtId && hiddenDistricts[park.districtId]) return false;
		return true;
	}

	function isFacilityTypeVisible(type: string) {
		return !hiddenFacilityTypes[type];
	}

	// Filter parks list to only show parks from visible districts
	let filteredParks = $derived(
		parks.filter((park) => !park.districtId || isDistrictVisible(park.districtId))
	);

	// Function to open image modal (exposed to window for popup onclick)
	function openImageModal(url: string) {
		modalImageUrl = url;
		showImageModal = true;
	}

	function closeImageModal() {
		showImageModal = false;
		modalImageUrl = null;
	}

	// Function to close popup (exposed to window for popup onclick)
	function closePopup() {
		map.closePopup();
	}

	// Handle Escape key to close modal
	$effect(() => {
		if (showImageModal) {
			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					closeImageModal();
				}
			};
			window.addEventListener('keydown', handleEscape);
			return () => {
				window.removeEventListener('keydown', handleEscape);
			};
		}
	});

	onMount(() => {
		// Expose functions to window for popup onclick handlers
		(window as any).openImageModal = openImageModal;
		(window as any).closePopup = closePopup;

		// Initialize map
		map = L.map(mapContainer).setView([55.85, 37.52], 12); // Moscow North District (SAO)

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(map);

		// Initialize feature group for districts (lower layer)
		districtLayer = new L.FeatureGroup();
		map.addLayer(districtLayer);

		// Initialize feature group for drawn items (parks)
		drawnItems = new L.FeatureGroup();
		map.addLayer(drawnItems);

		// Initialize marker cluster group
		markerClusterGroup = L.markerClusterGroup();
		map.addLayer(markerClusterGroup);

		// Load existing districts
		loadDistricts();

		// Load existing parks
		loadParks();

		// Load existing facilities
		loadFacilities();

		// Set up draw controls if admin
		if (isAdmin) {
			setupDrawControls();
		}

		return () => {
			map.remove();
		};
	});

	function setupDrawControls() {
		drawControl = new L.Control.Draw({
			position: 'topright',
			draw: {
				polygon: {
					allowIntersection: false,
					drawError: {
						color: '#e1e100',
						message: '<strong>Error:</strong> shape edges cannot cross!'
					},
					shapeOptions: {
						color: '#97009c'
					}
				},
				polyline: false,
				circle: false,
				rectangle: false,
				marker: false,
				circlemarker: false
			},
			edit: false
		} as L.Control.DrawConstructorOptions);

		map.addControl(drawControl);

		// Handle polygon creation
		map.on(L.Draw.Event.CREATED, (event: L.LeafletEvent) => {
			const drawEvent = event as L.DrawEvents.Created;
			const layer = drawEvent.layer;

			if (drawEvent.layerType === 'polygon') {
				const geometry = layer.toGeoJSON().geometry as Geometry;

				if (isDrawingDistrict) {
					isDrawingDistrict = false;
					activeDrawHandler = null;
					onDistrictCreate?.(geometry);
				} else if (isDrawingPark) {
					drawnItems.addLayer(layer);
					isDrawingPark = false;
					activeDrawHandler = null;
					onParkCreate?.(geometry);
				}
			}
		});
	}

	function loadDistricts() {
		// Close any open popups before reloading
		map.closePopup();

		districtLayer.clearLayers();

		if (!districts || districts.length === 0) return;

		districts.forEach((district) => {
			// Filter: Skip if district is hidden
			if (!isDistrictVisible(district.id)) return;
			if (district.geometry) {
				const layer = L.geoJSON(district.geometry, {
					style: {
						color: '#ff6b35',
						fillColor: '#ff6b6b',
						fillOpacity: 0.15,
						weight: 3
					}
				});

				// Don't add popup if placing facility
				if (!isPlacingFacility) {
					// Count parks in this district
					const parksInDistrict = parks.filter((p) => p.districtId === district.id);
					const parkCount = parksInDistrict.length;

					// Create popup content
					let popupContent = `
						<div class="district-popup">
							<h3>${district.name}</h3>
							${district.area ? `<p><strong>Площадь:</strong> ${formatNumber(district.area)} м² (${formatNumber(district.area / 10000)} га)</p>` : ''}
							<p><strong>Парки:</strong> ${parkCount}</p>
							${parkCount > 0 ? `<ul class="park-list">${parksInDistrict.map((p) => `<li>${p.name}</li>`).join('')}</ul>` : '<p class="no-parks">Нет парков в этом районе</p>'}
							${
								isAdmin
									? `
								<div class="button-group" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
									<button onclick="window.editDistrict(${district.id})" class="edit-btn" style="flex: 1; background: #333; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Изменить</button>
									<button onclick="window.deleteDistrict(${district.id})" class="delete-btn" style="flex: 1; background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Удалить</button>
								</div>
							`
									: ''
							}
							<button onclick="window.closePopup()" class="close-popup-btn" style="width: 100%; background: #f0f0f0; color: #333; border: none; padding: 0.5rem 1rem; margin-top: 0.75rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Закрыть</button>
						</div>
					`;

					layer.bindPopup(popupContent, {
						maxWidth: 300,
						className: 'custom-popup',
						closeButton: false
					});
				}

				layer.addTo(districtLayer);
			}
		});
	}

	function loadParks() {
		// Close any open popups before reloading
		map.closePopup();

		if (!parks || parks.length === 0) return;

		parks.forEach((park) => {
			// Filter: Skip if park is hidden
			if (!isParkVisible(park.id)) return;
			if (park.geometry) {
				const layer = L.geoJSON(park.geometry, {
					style: {
						color: '#97009c',
						fillColor: '#97009c',
						fillOpacity: 0.2
					}
				});

				// Don't add popup if placing facility
				if (!isPlacingFacility) {
					// Find the district this park belongs to
					const district = districts.find((d) => d.id === park.districtId);

					// Count facilities by type in this park
					const parkFacilities = facilities.filter((f) => f.parkId === park.id);

					const facilityCounts: Record<string, number> = {
						SPORTS_PLAYGROUND: 0,
						CHILD_PLAYGROUND: 0,
						NTO: 0,
						TOILET: 0,
						CHILL: 0,
						CHILDREN_ROOM: 0
					};

					parkFacilities.forEach((f) => {
						if (f.type in facilityCounts) {
							facilityCounts[f.type]++;
						}
					});

					const facilityList = Object.entries(facilityCounts)
						.map(
							([type, count]) =>
								`<li>${FACILITY_TYPES[type as keyof typeof FACILITY_TYPES]}: ${count}</li>`
						)
						.join('');

					// Create popup content
					let popupContent = `
						<div class="park-popup">
							<h3>${park.name}</h3>
							${district ? `<p><strong>Район:</strong> ${district.name}</p>` : ''}
							${park.description ? `<p><strong>Описание:</strong> ${park.description}</p>` : ''}
							${park.area ? `<p><strong>Площадь:</strong> ${formatNumber(park.area)} м² (${formatNumber(park.area / 10000)} га)</p>` : ''}
							${park.balanceHolder ? `<p><strong>Балансодержатель:</strong> ${park.balanceHolder}</p>` : ''}
							<p><strong>Объекты:</strong></p>
							<ul class="facility-list">${facilityList}</ul>
							${
								isAdmin
									? `
								<div class="button-group" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
									<button onclick="window.editPark(${park.id})" class="edit-btn" style="flex: 1; background: #333; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Изменить</button>
									<button onclick="window.deletePark(${park.id})" class="delete-btn" style="flex: 1; background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Удалить</button>
								</div>
							`
									: ''
							}
							<button onclick="window.closePopup()" class="close-popup-btn" style="width: 100%; background: #f0f0f0; color: #333; border: none; padding: 0.5rem 1rem; margin-top: 0.75rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Закрыть</button>
						</div>
					`;

					layer.bindPopup(popupContent, {
						maxWidth: 300,
						className: 'custom-popup',
						closeButton: false
					});
				}

				layer.addTo(drawnItems);
			}
		});
	}

	function loadFacilities() {
		// Close any open popups before reloading
		map.closePopup();

		markerClusterGroup.clearLayers();

		if (!facilities || facilities.length === 0) return;

		facilities.forEach((facility) => {
			// Filter: Skip if facility type is hidden
			if (!isFacilityTypeVisible(facility.type)) return;
			// Filter: Skip if facility's park is hidden
			if (facility.parkId && !isParkVisible(facility.parkId)) return;
			const icon = L.divIcon({
				html: FACILITY_ICONS[facility.type as keyof typeof FACILITY_ICONS] || '📍',
				className: 'facility-marker',
				iconSize: [30, 30]
			});

			const marker = L.marker([facility.latitude, facility.longitude], { icon });

			// Don't add popup if placing facility
			if (!isPlacingFacility) {
				// Find the park this facility belongs to
				const park = parks.find((p) => p.id === facility.parkId);

				// Format contract term if exists (format: "[YYYY-MM-DD,YYYY-MM-DD)")
				let formattedContractTerm = '';
				if (facility.contractTerm) {
					const match = facility.contractTerm.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
					if (match) {
						const startDate = new Date(match[1]).toLocaleDateString('ru-RU');
						const endDate = new Date(match[2]).toLocaleDateString('ru-RU');
						formattedContractTerm = `от ${startDate} до ${endDate}`;
					}
				}

				// Create popup content
				let popupContent = `
					<div class="facility-popup">
						${facility.photo ? `<img src="${facility.photo}" alt="${facility.name}" class="popup-image" style="width: 100%; height: auto; object-fit: contain; border-radius: 4px 4px 0 0; margin: -1rem -1rem 0.5rem -1rem; display: block; cursor: pointer;" onclick="window.openImageModal('${facility.photo}')" />` : ''}
						<h3>${facility.name}</h3>
						<h5>${facility.latitude.toFixed(6)}, ${facility.longitude.toFixed(6)}</h5>
						${park ? `<p><strong>Парк:</strong> ${park.name}</p>` : ''}
						<p><strong>Тип:</strong> ${FACILITY_TYPES[facility.type as keyof typeof FACILITY_TYPES] || facility.type}</p>
						${facility.description ? `<p><strong>Описание:</strong> ${facility.description}</p>` : ''}
						${facility.area && true ? `<p><strong>Площадь:</strong> ${formatNumber(facility.area)} м²</p>` : ''}
						${facility.surfaceType ? `<p><strong>Тип покрытия:</strong> ${facility.surfaceType}</p>` : ''}
						${facility.mafCount ? `<p><strong>Количество МАФ:</strong> ${facility.mafCount}</p>` : ''}
						${facility.contractAction ? `<p><strong>Специализация:</strong> ${facility.contractAction}</p>` : ''}
						${facility.contractWith ? `<p><strong>C кем контракт:</strong> ${facility.contractWith}</p>` : ''}
						${formattedContractTerm ? `<p><strong>Cрок контракта:</strong> ${formattedContractTerm}</p>` : ''}
						${
							isAdmin
								? `
							<div class="button-group" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
								<button onclick="window.editFacility(${facility.id})" class="edit-btn" style="flex: 1; background: #333; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Изменить</button>
								<button onclick="window.deleteFacility(${facility.id})" class="delete-btn" style="flex: 1; background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Удалить</button>
							</div>
						`
								: ''
						}
						<button onclick="window.closePopup()" class="close-popup-btn" style="width: 100%; background: #f0f0f0; color: #333; border: none; padding: 0.5rem 1rem; margin-top: 0.75rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Закрыть</button>
					</div>
				`;

				marker.bindPopup(popupContent, {
					maxWidth: 300,
					className: 'custom-popup',
					closeButton: false
				});
			}

			markerClusterGroup.addLayer(marker);
		});
	}

	function cancelAllModes() {
		// Disable the active draw handler
		if (activeDrawHandler) {
			try {
				activeDrawHandler.disable();
				activeDrawHandler = null;
			} catch (e) {
				console.error('Error disabling handler:', e);
			}
		}

		// Remove click handlers
		if (map) {
			map.off('click');

			// Remove any temporary drawing layers
			try {
				const layersToRemove: L.Layer[] = [];
				let tileLayer: L.Layer | null = null;

				// Get tile layer reference
				map.eachLayer((layer: L.Layer) => {
					if (layer instanceof L.TileLayer) {
						tileLayer = layer;
					}
				});

				map.eachLayer((layer: L.Layer) => {
					// Skip tile layer, feature groups, and marker cluster
					if (
						layer === tileLayer ||
						layer === drawnItems ||
						layer === districtLayer ||
						layer === markerClusterGroup
					) {
						return;
					}

					// Skip layers that belong to our feature groups
					if (
						drawnItems.hasLayer(layer) ||
						districtLayer.hasLayer(layer) ||
						markerClusterGroup.hasLayer(layer)
					) {
						return;
					}

					// Remove polylines that are temporary drawing previews
					if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
						const classNames = layer.options.className || '';
						if (classNames.includes('leaflet-interactive')) {
							layersToRemove.push(layer);
						}
					}

					// Remove vertex markers (circular markers used for drawing)
					if (layer instanceof L.CircleMarker) {
						layersToRemove.push(layer);
					}

					// Remove regular markers only if they have drawing-related classes
					if (layer instanceof L.Marker && !(layer instanceof L.CircleMarker)) {
						const iconElement = layer.getElement?.();
						const iconClasses = iconElement?.className || '';
						if (
							iconClasses.includes('leaflet-marker-draggable') ||
							iconClasses.includes('leaflet-editing-icon') ||
							iconClasses.includes('leaflet-marker-icon leaflet-zoom-animated leaflet-interactive')
						) {
							layersToRemove.push(layer);
						}
					}
				});

				// Remove the collected layers
				layersToRemove.forEach((layer) => {
					try {
						map.removeLayer(layer);
					} catch {
						// Layer might already be removed
					}
				});
			} catch (e) {
				console.error('Error removing layers:', e);
			}
		}

		isDrawingDistrict = false;
		isDrawingPark = false;
		isPlacingFacility = false;
	}

	function startDrawingDistrict() {
		cancelAllModes();
		isDrawingDistrict = true;
		// Trigger polygon draw mode
		const options = drawControl.options as L.Control.DrawConstructorOptions;
		const polygonOptions = options.draw?.polygon;
		activeDrawHandler = new L.Draw.Polygon(
			map as L.DrawMap,
			typeof polygonOptions === 'object' ? polygonOptions : undefined
		);
		activeDrawHandler.enable();
	}

	function startDrawingPark() {
		cancelAllModes();
		isDrawingPark = true;
		// Trigger polygon draw mode
		const options = drawControl.options as L.Control.DrawConstructorOptions;
		const polygonOptions = options.draw?.polygon;
		activeDrawHandler = new L.Draw.Polygon(
			map as L.DrawMap,
			typeof polygonOptions === 'object' ? polygonOptions : undefined
		);
		activeDrawHandler.enable();
	}

	function startPlacingFacility() {
		cancelAllModes();
		isPlacingFacility = true;
		map.once('click', (e: L.LeafletMouseEvent) => {
			onFacilityCreate?.(e.latlng.lat, e.latlng.lng);
			isPlacingFacility = false;
			activeDrawHandler = null;
		});
	}

	// Filter helper functions - toggle visibility
	function toggleDistrict(id: number) {
		hiddenDistricts[id] = !hiddenDistricts[id];
	}

	function togglePark(id: number) {
		hiddenParks[id] = !hiddenParks[id];
	}

	function toggleFacilityType(type: string) {
		hiddenFacilityTypes[type] = !hiddenFacilityTypes[type];
	}

	function selectAllDistricts() {
		hiddenDistricts = {};
	}

	function deselectAllDistricts() {
		const hidden: Record<number, boolean> = {};
		districts.forEach((d) => (hidden[d.id] = true));
		hiddenDistricts = hidden;
	}

	function selectAllParks() {
		hiddenParks = {};
	}

	function deselectAllParks() {
		const hidden: Record<number, boolean> = {};
		parks.forEach((p) => (hidden[p.id] = true));
		hiddenParks = hidden;
	}

	function selectAllFacilityTypes() {
		hiddenFacilityTypes = {};
	}

	function deselectAllFacilityTypes() {
		const hidden: Record<string, boolean> = {};
		Object.keys(FACILITY_TYPES).forEach((type) => (hidden[type] = true));
		hiddenFacilityTypes = hidden;
	}

	// Reactive updates - track the hidden objects
	$effect(() => {
		hiddenDistricts;
		if (map && districts) {
			loadDistricts();
		}
	});

	$effect(() => {
		hiddenParks;
		hiddenDistricts;
		if (map && parks) {
			drawnItems.clearLayers();
			loadParks();
		}
	});

	$effect(() => {
		hiddenFacilityTypes;
		hiddenParks;
		hiddenDistricts;
		if (map && facilities) {
			loadFacilities();
		}
	});
</script>

<div class="map-wrapper">
	<div bind:this={mapContainer} class="map"></div>

	{#if isAdmin}
		<div class="controls">
			<button onclick={startDrawingDistrict} disabled={isDrawingDistrict}>
				{isDrawingDistrict ? 'Рисование...' : 'Добавить район'}
			</button>
			<button onclick={startDrawingPark} disabled={isDrawingPark}>
				{isDrawingPark ? 'Рисование...' : 'Добавить парк'}
			</button>
			<button onclick={startPlacingFacility} disabled={isPlacingFacility}>
				{isPlacingFacility ? 'Кликните на карту...' : 'Добавить объект'}
			</button>
			{#if isDrawingDistrict || isDrawingPark || isPlacingFacility}
				<button onclick={cancelAllModes} class="cancel-btn"> Отмена </button>
			{/if}
		</div>
	{/if}

	<!-- Filter Panel -->
	<div class="filter-toggle">
		<button onclick={() => (showFilterPanel = !showFilterPanel)}>
			{showFilterPanel ? 'Скрыть фильтры' : 'Показать фильтры'}
		</button>
	</div>

	{#if showFilterPanel}
		<div class="filter-panel">
			<h3>Фильтры</h3>

			<!-- Facility Types Filter -->
			<div class="filter-section">
				<div class="filter-header">
					<h4>Объекты</h4>
					<div class="filter-buttons">
						<button onclick={selectAllFacilityTypes} class="filter-btn">Все</button>
						<button onclick={deselectAllFacilityTypes} class="filter-btn">Ничего</button>
					</div>
				</div>
				<div class="filter-checkboxes">
					{#each Object.entries(FACILITY_TYPES) as [type, label] (type)}
						{@const isChecked = isFacilityTypeVisible(type)}
						<button
							class="checkbox-button {isChecked ? 'checked' : ''}"
							onclick={() => toggleFacilityType(type)}
						>
							<span class="checkbox-box">
								{#if isChecked}✓{/if}
							</span>
							{FACILITY_ICONS[type as keyof typeof FACILITY_ICONS]}
							{label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Districts Filter -->
			<div class="filter-section">
				<div class="filter-header">
					<h4>Районы</h4>
					<div class="filter-buttons">
						<button onclick={selectAllDistricts} class="filter-btn">Все</button>
						<button onclick={deselectAllDistricts} class="filter-btn">Ничего</button>
					</div>
				</div>
				<div class="filter-checkboxes">
					{#each districts as district (district.id)}
						{@const isChecked = isDistrictVisible(district.id)}
						<button
							class="checkbox-button {isChecked ? 'checked' : ''}"
							onclick={() => toggleDistrict(district.id)}
						>
							<span class="checkbox-box">
								{#if isChecked}✓{/if}
							</span>
							{district.name}
						</button>
					{/each}
				</div>
			</div>

			<!-- Parks Filter -->
			<div class="filter-section">
				<div class="filter-header">
					<h4>Парки</h4>
					<div class="filter-buttons">
						<button onclick={selectAllParks} class="filter-btn">Все</button>
						<button onclick={deselectAllParks} class="filter-btn">Ничего</button>
					</div>
				</div>
				<div class="filter-checkboxes">
					{#each filteredParks as park (park.id)}
						{@const isChecked = isParkVisible(park.id)}
						<button
							class="checkbox-button {isChecked ? 'checked' : ''}"
							onclick={() => togglePark(park.id)}
						>
							<span class="checkbox-box">
								{#if isChecked}✓{/if}
							</span>
							{park.name}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Image Modal -->
	{#if showImageModal && modalImageUrl}
		<div
			class="image-modal"
			onclick={closeImageModal}
			onkeydown={(e) => e.key === 'Escape' && closeImageModal()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div
				class="image-modal-content"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="document"
			>
				<button class="image-modal-close" onclick={closeImageModal}>&times;</button>
				<img src={modalImageUrl} alt="Facility" />
			</div>
		</div>
	{/if}
</div>

<style>
	.map-wrapper {
		position: relative;
		width: 100%;
		height: 100vh;
	}

	.map {
		width: 100%;
		height: 100%;
	}

	.controls {
		position: absolute;
		top: 10px;
		left: 100px;
		z-index: 1000;
		display: flex;
		gap: 10px;
	}

	.controls button {
		padding: 10px 20px;
		background: white;
		border: 2px solid #333;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}

	/* Hide Leaflet attribution flag */
	:global(.leaflet-control-attribution a[href*='leaflet']) {
		display: none;
	}

	/* Mobile styles */
	@media (max-width: 768px) {
		.controls {
			flex-direction: column;
			left: 10px;
		}

		.controls button {
			padding: 8px 12px;
			font-size: 0.9rem;
		}
	}

	.controls button:hover:not(:disabled) {
		background: #f0f0f0;
	}

	.controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.controls button.cancel-btn {
		background: #dc3545;
		color: white;
		border-color: #dc3545;
	}

	.controls button.cancel-btn:hover {
		background: #c82333;
		border-color: #c82333;
	}

	:global(.facility-marker) {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		background: white;
		border-radius: 50%;
		border: 2px solid #333;
	}

	:global(.custom-popup .leaflet-popup-content) {
		margin: 0;
		padding: 0;
	}

	:global(.custom-popup .leaflet-popup-close-button) {
		display: none !important;
	}

	:global(.close-popup-btn:hover) {
		background: #e0e0e0 !important;
	}

	:global(.district-popup),
	:global(.park-popup),
	:global(.facility-popup) {
		padding: 1rem;
		min-width: 200px;
		max-width: 300px;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.district-popup h3),
	:global(.park-popup h3),
	:global(.facility-popup h3) {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		color: #333;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.district-popup h5),
	:global(.park-popup h5),
	:global(.facility-popup h5) {
		margin: 0.25rem 0;
		font-size: 0.85rem;
		color: #888;
		word-wrap: break-word;
		overflow-wrap: break-word;
		font-weight: normal;
	}

	:global(.district-popup p),
	:global(.park-popup p),
	:global(.facility-popup p) {
		margin: 0.25rem 0;
		font-size: 0.9rem;
		color: #666;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.district-popup strong),
	:global(.park-popup strong),
	:global(.facility-popup strong) {
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.park-list),
	:global(.facility-list) {
		margin: 0.5rem 0;
		padding-left: 1.2rem;
		font-size: 0.9rem;
		color: #555;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.park-list li),
	:global(.facility-list li) {
		margin: 0.2rem 0;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(.no-parks),
	:global(.no-facilities) {
		font-style: italic;
		color: #999;
	}

	:global(.popup-image) {
		object-fit: cover;
		max-height: 200px;
		width: 100%;
	}

	/* Filter Panel Styles */
	.filter-toggle {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1000;
	}

	.filter-toggle button {
		padding: 10px 20px;
		background: white;
		border: 2px solid #333;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}

	.filter-toggle button:hover {
		background: #f0f0f0;
	}

	.filter-panel {
		position: absolute;
		top: 60px;
		right: 10px;
		z-index: 1000;
		background: white;
		border: 2px solid #333;
		border-radius: 4px;
		padding: 1rem;
		max-width: 300px;
		max-height: calc(100vh - 80px);
		overflow-y: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.filter-panel h3 {
		margin: 0 0 1rem 0;
		font-size: 1.2rem;
		color: #333;
	}

	.filter-section {
		margin-bottom: 1.5rem;
	}

	.filter-section:last-child {
		margin-bottom: 0;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.filter-header h4 {
		margin: 0;
		font-size: 1rem;
		color: #333;
	}

	.filter-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.filter-btn {
		padding: 0.25rem 0.5rem;
		background: #f0f0f0;
		border: 1px solid #ddd;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.filter-btn:hover {
		background: #e0e0e0;
	}

	.filter-checkboxes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: #555;
		background: none;
		border: none;
		padding: 0.25rem 0;
		text-align: left;
		width: 100%;
	}

	.checkbox-button:hover {
		color: #333;
	}

	.checkbox-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: 2px solid #999;
		border-radius: 3px;
		background: white;
		flex-shrink: 0;
		font-size: 12px;
		line-height: 1;
	}

	.checkbox-button.checked .checkbox-box {
		background: #333;
		border-color: #333;
		color: white;
	}

	:global(.district-popup .delete-btn),
	:global(.park-popup .delete-btn),
	:global(.facility-popup .delete-btn) {
		font-weight: 600;
	}

	:global(.district-popup .delete-btn:hover),
	:global(.park-popup .delete-btn:hover),
	:global(.facility-popup .delete-btn:hover) {
		background: #c82333 !important;
	}

	/* Image Modal Styles */
	.image-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.image-modal-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		cursor: default;
	}

	.image-modal-content img {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		display: block;
	}

	.image-modal-close {
		position: absolute;
		top: -60px;
		right: 0;
		background: none;
		border: none;
		color: white;
		font-size: 60px;
		font-weight: 300;
		cursor: pointer;
		padding: 0;
		width: 60px;
		height: 60px;
		line-height: 1;
		transition: opacity 0.2s;
	}

	.image-modal-close:hover {
		opacity: 0.7;
	}
</style>
