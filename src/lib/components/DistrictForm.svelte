<script lang="ts">
	import * as turf from '@turf/turf';

	type District = {
		id: number;
		name: string;
		geometry: { type: string; coordinates: number[][][] };
	};

	let {
		geometry,
		district = null,
		onSubmit,
		onCancel
	}: {
		geometry: { type: string; coordinates: number[][][] };
		district?: District | null;
		onSubmit: (data: District) => void;
		onCancel: () => void;
	} = $props();

	let isEditMode = $derived(!!district);

	let name = $state(district?.name || '');
	let loading = $state(false);
	let error = $state('');

	// Auto-calculate area from geometry (in square meters)
	let area = $derived.by(() => {
		if (!geometry) return null;
		try {
			const polygon = turf.polygon(geometry.coordinates);
			return turf.area(polygon); // Returns area in square meters
		} catch (e) {
			console.error('Failed to calculate area:', e);
			return null;
		}
	});

	async function handleSubmit() {
		error = '';

		if (!name) {
			error = 'Требуется название';
			return;
		}

		loading = true;

		try {
			const url = isEditMode ? `/api/districts/${district?.id}` : '/api/districts';
			const method = isEditMode ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					geometry
				})
			});

			if (response.ok) {
				const updatedDistrict = await response.json();
				onSubmit(updatedDistrict);
			} else {
				const data = await response.json();
				error = data.error || `Не удалось ${isEditMode ? 'обновить' : 'создать'} округ`;
			}
		} catch (err) {
			error = 'Произошла ошибка';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="form-container">
	<h2>{isEditMode ? 'Редактировать округ' : 'Создать новый округ'}</h2>

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
			<input
				type="text"
				id="name"
				bind:value={name}
				required
				placeholder="Введите название округа"
			/>
		</div>

		{#if area}
			<div class="info-field">
				<label>Вычисленная площадь</label>
				<div class="info-value">{area.toFixed(2)} м² ({(area / 10000).toFixed(2)} гектаров)</div>
			</div>
		{/if}

		<div class="button-group">
			<button type="button" onclick={onCancel} disabled={loading}> Отмена </button>
			<button type="submit" disabled={loading}>
				{loading
					? isEditMode
						? 'Обновление...'
						: 'Создание...'
					: isEditMode
						? 'Обновить округ'
						: 'Создать округ'}
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

	.info-field {
		margin-bottom: 1.25rem;
		padding: 0.75rem;
		background: #f9f9f9;
		border-radius: 4px;
		border: 1px solid #e0e0e0;
	}

	.info-field label {
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		color: #666;
	}

	.info-value {
		font-weight: 600;
		color: #333;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #333;
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
