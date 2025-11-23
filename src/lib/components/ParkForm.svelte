<script lang="ts">
	import * as turf from '@turf/turf';

	let {
		geometry,
		districts,
		park = null,
		onSubmit,
		onCancel
	}: {
		geometry: any;
		districts: any[];
		park?: any;
		onSubmit: (data: any) => void;
		onCancel: () => void;
	} = $props();

	let isEditMode = $derived(!!park);

	let name = $state(park?.name || '');
	let description = $state(park?.description || '');
	let balanceHolder = $state(park?.balanceHolder || '');
	let districtId = $state(park?.districtId?.toString() || '');
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

		if (!districtId) {
			error = 'Требуется выбор округа';
			return;
		}

		loading = true;

		try {
			const url = isEditMode ? `/api/parks/${park.id}` : '/api/parks';
			const method = isEditMode ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					description: description || null,
					geometry,
					area: area || null,
					balanceHolder: balanceHolder || null,
					districtId: parseInt(districtId)
				})
			});

			if (response.ok) {
				const updatedPark = await response.json();
				onSubmit(updatedPark);
			} else {
				const data = await response.json();
				error = data.error || `Не удалось ${isEditMode ? 'обновить' : 'создать'} парк`;
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
	<h2>{isEditMode ? 'Редактировать парк' : 'Создать новый парк'}</h2>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<div class="form-group">
			<label for="name">Название *</label>
			<input
				type="text"
				id="name"
				bind:value={name}
				required
				placeholder="Введите название парка"
			/>
		</div>

		<div class="form-group">
			<label for="districtId">Округ *</label>
			<select id="districtId" bind:value={districtId} required>
				<option value="">Выберите округ</option>
				{#each districts as district}
					<option value={district.id}>{district.name}</option>
				{/each}
			</select>
		</div>

		{#if area}
			<div class="info-field">
				<label>Вычисленная площадь</label>
				<div class="info-value">{area.toFixed(2)} м² ({(area / 10000).toFixed(2)} гектаров)</div>
			</div>
		{/if}

		<div class="form-group">
			<label for="balanceHolder">Балансодержатель</label>
			<input
				type="text"
				id="balanceHolder"
				bind:value={balanceHolder}
				placeholder="Введите балансодержателя"
			/>
		</div>

		<div class="form-group">
			<label for="description">Описание</label>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				placeholder="Опишите парк..."
			></textarea>
		</div>

		<div class="button-group">
			<button type="button" onclick={onCancel} disabled={loading}>
				Отмена
			</button>
			<button type="submit" disabled={loading}>
				{loading ? (isEditMode ? 'Обновление...' : 'Создание...') : (isEditMode ? 'Обновить парк' : 'Создать парк')}
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
