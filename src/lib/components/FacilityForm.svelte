<script lang="ts">
	import * as turf from '@turf/turf';
	import { FACILITY_TYPE_OPTIONS } from '$lib/constants';

	let {
		latitude,
		longitude,
		parks,
		facility = null,
		onSubmit,
		onCancel
	}: {
		latitude: number;
		longitude: number;
		parks: any[];
		facility?: any;
		onSubmit: (data: any) => void;
		onCancel: () => void;
	} = $props();

	let isEditMode = $derived(!!facility);

	let name = $state(facility?.name || '');
	let type = $state(facility?.type || 'SPORTS_PLAYGROUND');
	let description = $state(facility?.description || '');
	let contractAction = $state(facility?.contractAction || '');
	let contractWith = $state(facility?.contractWith || '');
	let contractTerm = $state(facility?.contractTerm || '');
	let photoFile = $state<File | null>(null);
	let photoUrl = $state(facility?.photo || '');
	let loading = $state(false);
	let error = $state('');

	// Auto-detect which park this facility belongs to
	let detectedPark = $derived.by(() => {
		const point = turf.point([longitude, latitude]);

		for (const park of parks) {
			if (park.geometry) {
				try {
					const polygon = turf.polygon(park.geometry.coordinates);
					if (turf.booleanPointInPolygon(point, polygon)) {
						return park;
					}
				} catch (e) {
					console.error('Failed to check if point is in park:', e);
				}
			}
		}
		return null;
	});

	// Use derived to automatically update parkId based on edit mode and detected park
	let parkId = $state('');

	// Initialize parkId with a derived value and then keep it as state for manual changes
	$effect(() => {
		if (isEditMode && facility?.parkId) {
			// In edit mode, use the facility's parkId
			parkId = facility.parkId.toString();
		} else if (!isEditMode && detectedPark && !parkId) {
			// In create mode, auto-select detected park if no park is manually selected
			parkId = String(detectedPark.id);
		}
	});


	async function handlePhotoUpload() {
		if (!photoFile) return null;

		const formData = new FormData();
		formData.append('file', photoFile);

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error('Failed to upload photo');
		}

		const data = await response.json();
		return data.url;
	}

	async function handleSubmit() {
		error = '';

		if (!name) {
			error = 'Name is required';
			return;
		}

		if (!parkId) {
			error = 'Park selection is required';
			return;
		}

		loading = true;

		try {
			// Upload photo if provided
			if (photoFile) {
				photoUrl = await handlePhotoUpload();
			}

			const url = isEditMode ? `/api/facilities/${facility.id}` : '/api/facilities';
			const method = isEditMode ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					type,
					latitude,
					longitude,
					description: description || null,
					photo: photoUrl || null,
					contractAction: contractAction || null,
					contractWith: contractWith || null,
					contractTerm: contractTerm || null,
					parkId: parseInt(parkId)
				})
			});

			if (response.ok) {
				const updatedFacility = await response.json();
				onSubmit(updatedFacility);
			} else {
				const data = await response.json();
				error = data.error || `Failed to ${isEditMode ? 'update' : 'create'} facility`;
			}
		} catch (err) {
			error = 'An error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			photoFile = target.files[0];
		}
	}
</script>

<div class="form-container">
	<h2>{isEditMode ? 'Редактировать объект' : 'Создать новый объект'}</h2>

	<p class="location-info">
		Расположение: {latitude.toFixed(6)}, {longitude.toFixed(6)}
	</p>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="form-group">
			<label for="name">Название *</label>
			<input type="text" id="name" bind:value={name} required placeholder="Введите название объекта" />
		</div>

		<div class="form-group">
			<label for="type">Тип *</label>
			<select id="type" bind:value={type} required>
				{#each FACILITY_TYPE_OPTIONS as ft}
					<option value={ft.value}>{ft.label}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label for="parkId">Парк * {detectedPark && !isEditMode ? '(Определен автоматически)' : ''}</label>
			<select id="parkId" bind:value={parkId} required>
				<option value="">Выберите парк</option>
				{#each parks as park}
					<option value={String(park.id)}>{park.name}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label for="contractAction">Специализация</label>
			<input
				type="text"
				id="contractAction"
				bind:value={contractAction}
				placeholder="Введите специализацию"
			/>
		</div>

		<div class="form-group">
			<label for="contractWith">C кем контракт</label>
			<input
				type="text"
				id="contractWith"
				bind:value={contractWith}
				placeholder="Введите контрагента"
			/>
		</div>

		<div class="form-group">
			<label for="contractTerm">Cрок контракта</label>
			<input
				type="text"
				id="contractTerm"
				bind:value={contractTerm}
				placeholder="Введите срок контракта"
			/>
		</div>

		<div class="form-group">
			<label for="description">Описание</label>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				placeholder="Опишите объект..."
			></textarea>
		</div>

		<div class="form-group">
			<label for="photo">Фото</label>
			<input type="file" id="photo" accept="image/*" onchange={handleFileChange} />
			{#if photoFile}
				<small>Выбрано: {photoFile.name}</small>
			{:else if photoUrl}
				<small>Текущее фото: <a href={photoUrl} target="_blank">Посмотреть</a></small>
			{/if}
		</div>

		<div class="button-group">
			<button type="button" onclick={onCancel} disabled={loading}> Отмена </button>
			<button type="submit" disabled={loading}>
				{loading
					? isEditMode
						? 'Обновление...'
						: 'Создание...'
					: isEditMode
						? 'Обновить объект'
						: 'Создать объект'}
			</button>
		</div>
	</form>
</div>

<style>
	.form-container {
		width: 100%;
		max-width: 500px;
	}

	h2 {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}

	.location-info {
		color: #666;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.error {
		background: #fee;
		color: #c33;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input,
	textarea,
	select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus,
	select:focus {
		outline: none;
		border-color: #333;
	}

	small {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.875rem;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	button {
		flex: 1;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}

	button[type='button'] {
		background: #f0f0f0;
		color: #333;
	}

	button[type='submit'] {
		background: #333;
		color: white;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
