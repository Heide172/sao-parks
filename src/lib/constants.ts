export const FACILITY_TYPES = {
	SPORTS_PLAYGROUND: 'Спортивная площадка',
	CHILD_PLAYGROUND: 'Детская площадка',
	NTO: 'НТО',
	TOILET: 'Туалет',
	CHILL: 'Зона отдыха',
	CHILDREN_ROOM: 'Детская комната'
} as const;

export const FACILITY_TYPE_OPTIONS = [
	{ value: 'SPORTS_PLAYGROUND', label: 'Спортивная площадка' },
	{ value: 'CHILD_PLAYGROUND', label: 'Детская площадка' },
	{ value: 'NTO', label: 'НТО' },
	{ value: 'TOILET', label: 'Туалет' },
	{ value: 'CHILL', label: 'Зона отдыха' },
	{ value: 'CHILDREN_ROOM', label: 'Детская комната' }
] as const;

export const FACILITY_ICONS = {
	SPORTS_PLAYGROUND: '⚽',
	CHILD_PLAYGROUND: '🎠',
	NTO: '🏢',
	TOILET: '🚻',
	CHILL: '🌳',
	CHILDREN_ROOM: '👶'
} as const;
