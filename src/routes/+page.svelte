<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Map from '$lib/components/Map.svelte';
	import ParkForm from '$lib/components/ParkForm.svelte';
	import FacilityForm from '$lib/components/FacilityForm.svelte';
	import DistrictForm from '$lib/components/DistrictForm.svelte';

	type Geometry = { type: string; coordinates: number[][][] };

	type District = {
		id: number;
		name: string;
		geometry: Geometry;
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
	};

	let parks = $state<Park[]>([]);
	let facilities = $state<Facility[]>([]);
	let districts = $state<District[]>([]);
	let isAuthenticated = $state(false);
	let loading = $state(true);

	let showParkForm = $state(false);
	let showFacilityForm = $state(false);
	let showDistrictForm = $state(false);

	let newParkGeometry = $state<Geometry | null>(null);
	let newFacilityLat = $state(0);
	let newFacilityLng = $state(0);
	let newDistrictGeometry = $state<Geometry | null>(null);

	let editingDistrict = $state<District | null>(null);
	let editingPark = $state<Park | null>(null);
	let editingFacility = $state<Facility | null>(null);

	onMount(async () => {
		await checkAuth();
		await loadDistricts();
		await loadParks();
		await loadFacilities();
		loading = false;

		// Set up global functions for Leaflet popups
		interface WindowWithHandlers extends Window {
			editDistrict: (id: number) => void;
			editPark: (id: number) => void;
			editFacility: (id: number) => void;
			deleteDistrict: (id: number) => Promise<void>;
			deletePark: (id: number) => Promise<void>;
			deleteFacility: (id: number) => Promise<void>;
		}
		(window as WindowWithHandlers).editDistrict = handleDistrictEdit;
		(window as WindowWithHandlers).editPark = handleParkEdit;
		(window as WindowWithHandlers).editFacility = handleFacilityEdit;
		(window as WindowWithHandlers).deleteDistrict = handleDistrictDelete;
		(window as WindowWithHandlers).deletePark = handleParkDelete;
		(window as WindowWithHandlers).deleteFacility = handleFacilityDelete;
	});

	async function checkAuth() {
		try {
			const response = await fetch('/api/auth/session');
			const data = await response.json();
			isAuthenticated = data.authenticated;
		} catch {
			isAuthenticated = false;
		}
	}

	async function loadDistricts() {
		try {
			const response = await fetch('/api/districts');
			districts = await response.json();
		} catch (error) {
			console.error('Failed to load districts:', error);
		}
	}

	async function loadParks() {
		try {
			const response = await fetch('/api/parks');
			parks = await response.json();
		} catch (error) {
			console.error('Failed to load parks:', error);
		}
	}

	async function loadFacilities() {
		try {
			const response = await fetch('/api/facilities');
			facilities = await response.json();
		} catch (error) {
			console.error('Failed to load facilities:', error);
		}
	}

	function handleDistrictCreate(geometry: Geometry) {
		newDistrictGeometry = geometry;
		showDistrictForm = true;
	}

	function handleParkCreate(geometry: Geometry) {
		newParkGeometry = geometry;
		showParkForm = true;
	}

	function handleFacilityCreate(lat: number, lng: number) {
		newFacilityLat = lat;
		newFacilityLng = lng;
		showFacilityForm = true;
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		isAuthenticated = false;
	}

	async function handleDistrictDelete(districtId: number) {
		if (!confirm('Вы уверены, что хотите удалить этот округ?')) {
			return;
		}

		try {
			const response = await fetch(`/api/districts/${districtId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				districts = districts.filter((d) => d.id !== districtId);
			} else {
				const data = await response.json();
				alert(data.error || 'Не удалось удалить округ');
			}
		} catch (err) {
			console.error('Failed to delete district:', err);
			alert('Произошла ошибка при удалении округа');
		}
	}

	async function handleParkDelete(parkId: number) {
		if (
			!confirm(
				'Вы уверены, что хотите удалить этот парк? Это также удалит все объекты в этом парке.'
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/parks/${parkId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				parks = parks.filter((p) => p.id !== parkId);
				// Also remove facilities that belonged to this park
				facilities = facilities.filter((f) => f.parkId !== parkId);
			} else {
				const data = await response.json();
				alert(data.error || 'Не удалось удалить парк');
			}
		} catch (err) {
			console.error('Failed to delete park:', err);
			alert('Произошла ошибка при удалении парка');
		}
	}

	async function handleFacilityDelete(facilityId: number) {
		if (!confirm('Вы уверены, что хотите удалить этот объект?')) {
			return;
		}

		try {
			const response = await fetch(`/api/facilities/${facilityId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				facilities = facilities.filter((f) => f.id !== facilityId);
			} else {
				const data = await response.json();
				alert(data.error || 'Не удалось удалить объект');
			}
		} catch (err) {
			console.error('Failed to delete facility:', err);
			alert('Произошла ошибка при удалении объекта');
		}
	}

	function handleDistrictEdit(districtId: number) {
		const district = districts.find((d) => d.id === districtId);
		if (district) {
			editingDistrict = district;
			newDistrictGeometry = district.geometry;
			showDistrictForm = true;
		}
	}

	function handleParkEdit(parkId: number) {
		const park = parks.find((p) => p.id === parkId);
		if (park) {
			editingPark = park;
			newParkGeometry = park.geometry;
			showParkForm = true;
		}
	}

	function handleFacilityEdit(facilityId: number) {
		const facility = facilities.find((f) => f.id === facilityId);
		if (facility) {
			editingFacility = facility;
			newFacilityLat = facility.latitude;
			newFacilityLng = facility.longitude;
			showFacilityForm = true;
		}
	}

	function handleDistrictSubmit(district: District) {
		if (editingDistrict) {
			// Update existing district
			districts = districts.map((d) => (d.id === district.id ? district : d));
		} else {
			// Add new district
			districts = [...districts, district];
		}
		showDistrictForm = false;
		newDistrictGeometry = null;
		editingDistrict = null;
	}

	function handleParkSubmit(park: Park) {
		if (editingPark) {
			// Update existing park
			parks = parks.map((p) => (p.id === park.id ? park : p));
		} else {
			// Add new park
			parks = [...parks, park];
		}
		showParkForm = false;
		newParkGeometry = null;
		editingPark = null;
	}

	function handleFacilitySubmit(facility: Facility) {
		if (editingFacility) {
			// Update existing facility
			facilities = facilities.map((f) => (f.id === facility.id ? facility : f));
		} else {
			// Add new facility
			facilities = [...facilities, facility];
		}
		showFacilityForm = false;
		editingFacility = null;
	}

	function closeDistrictForm() {
		showDistrictForm = false;
		newDistrictGeometry = null;
		editingDistrict = null;
	}

	function closeParkForm() {
		showParkForm = false;
		newParkGeometry = null;
		editingPark = null;
	}

	function closeFacilityForm() {
		showFacilityForm = false;
		editingFacility = null;
	}
</script>

{#if loading}
	<div class="loading">Загрузка...</div>
{:else}
	<div class="app">
		<header>
			<h1>Парки САО</h1>
			{#if isAuthenticated}
				<button onclick={handleLogout} class="logout-btn">Выйти</button>
			{:else}
				<button
					onclick={() => {
						void goto(resolve('/admin/login'));
					}}
					class="login-btn">Вход для администратора</button
				>
			{/if}
		</header>

		<Map
			bind:parks
			bind:facilities
			bind:districts
			isAdmin={isAuthenticated}
			onDistrictCreate={handleDistrictCreate}
			onParkCreate={handleParkCreate}
			onFacilityCreate={handleFacilityCreate}
			onDistrictEdit={handleDistrictEdit}
			onParkEdit={handleParkEdit}
			onFacilityEdit={handleFacilityEdit}
			onDistrictDelete={handleDistrictDelete}
			onParkDelete={handleParkDelete}
			onFacilityDelete={handleFacilityDelete}
		/>

		{#if showDistrictForm && newDistrictGeometry}
			<div class="modal" onclick={(e) => e.target === e.currentTarget && closeDistrictForm()}>
				<div class="modal-content">
					<DistrictForm
						geometry={newDistrictGeometry}
						district={editingDistrict}
						onSubmit={handleDistrictSubmit}
						onCancel={closeDistrictForm}
					/>
				</div>
			</div>
		{/if}

		{#if showParkForm && newParkGeometry}
			<div class="modal" onclick={(e) => e.target === e.currentTarget && closeParkForm()}>
				<div class="modal-content">
					<ParkForm
						geometry={newParkGeometry}
						{districts}
						park={editingPark}
						onSubmit={handleParkSubmit}
						onCancel={closeParkForm}
					/>
				</div>
			</div>
		{/if}

		{#if showFacilityForm}
			<div class="modal" onclick={(e) => e.target === e.currentTarget && closeFacilityForm()}>
				<div class="modal-content">
					<FacilityForm
						latitude={newFacilityLat}
						longitude={newFacilityLng}
						{parks}
						facility={editingFacility}
						onSubmit={handleFacilitySubmit}
						onCancel={closeFacilityForm}
					/>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 1.5rem;
	}

	.app {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #333;
		color: white;
		z-index: 1001;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.logout-btn,
	.login-btn {
		padding: 0.5rem 1rem;
		background: white;
		color: #333;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
	}

	.logout-btn:hover,
	.login-btn:hover {
		background: #f0f0f0;
	}

	.modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 2000;
	}

	.modal-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 800px;
		width: 90%;
		max-height: 80vh;
		overflow: auto;
	}

	.modal-content h2 {
		margin-top: 0;
	}

	.modal-content .button-group {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.modal-content button {
		flex: 1;
		padding: 0.5rem 1rem;
		background: #333;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
	}

	.modal-content button:hover {
		opacity: 0.9;
	}

	.modal-content .delete-btn {
		background: #dc3545;
	}

	.modal-content .delete-btn:hover {
		background: #c82333;
	}

	.modal-content img {
		max-width: 100%;
		border-radius: 4px;
		margin-top: 1rem;
	}
</style>
