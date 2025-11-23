# SAO Parks

A web application for marking parks and facilities on an interactive map with admin-controlled editing.

## Features

- **Interactive Map**: Built with Leaflet for smooth map interactions
- **Park Management**: Draw park boundaries as polygons
- **Facility Management**: Place facility markers on the map
- **Marker Clustering**: Automatic clustering for better performance
- **Photo Upload**: Facilities can have photos stored in Vercel Blob
- **Admin Authentication**: Simple session-based authentication
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: SvelteKit 5, Tailwind CSS v4
- **Map**: Leaflet, Leaflet Draw, Leaflet MarkerCluster
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Storage**: Vercel Blob
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Neon database account
- A Vercel account (for blob storage and deployment)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd sao-parks
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="your_neon_database_url"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token"

# Authentication
AUTH_SECRET="generate_a_random_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
```

To generate `AUTH_SECRET`, run:

```bash
openssl rand -hex 32
```

4. Push the database schema:

```bash
bun run db:push
```

5. Start the development server:

```bash
bun run dev
```

Visit `http://localhost:5173` to see the app.

## Database Setup

### Using Neon

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL` in `.env`
4. Run `bun run db:push` to create tables

### Database Schema

The app uses three main tables:

- **districts**: Administrative districts
- **parks**: Park polygons with name, description, geometry
- **facilities**: Point markers with type, photo, and metadata

## Vercel Blob Storage Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Create a blob store: `vercel blob create`
4. Copy the token to `BLOB_READ_WRITE_TOKEN` in `.env`

## Admin Access

1. Navigate to `/admin/login`
2. Log in with the credentials from your `.env` file
3. You can now:
   - Add new parks by drawing polygons
   - Add new facilities by clicking on the map
   - Edit and delete existing items

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel

3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `BLOB_READ_WRITE_TOKEN`
   - `AUTH_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`

4. Deploy!

Alternatively, use the Vercel CLI:

```bash
vercel
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── Map.svelte          # Main map component
│   └── server/
│       ├── auth.ts             # Authentication utilities
│       ├── blob.ts             # Blob storage utilities
│       └── db/
│           ├── index.ts        # Database connection
│           └── schema.ts       # Drizzle schema
├── routes/
│   ├── +layout.svelte          # App layout
│   ├── +page.svelte            # Main app page
│   ├── admin/
│   │   └── login/+page.svelte  # Admin login page
│   └── api/
│       ├── auth/               # Auth endpoints
│       ├── parks/              # Park CRUD endpoints
│       ├── facilities/         # Facility CRUD endpoints
│       └── upload/+server.ts   # Photo upload endpoint
└── db/
    └── schema.ts               # Duplicate schema (for Drizzle Kit)
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Check session status

### Parks

- `GET /api/parks` - List all parks
- `POST /api/parks` - Create park (admin only)
- `GET /api/parks/[id]` - Get single park
- `PUT /api/parks/[id]` - Update park (admin only)
- `DELETE /api/parks/[id]` - Delete park (admin only)

### Facilities

- `GET /api/facilities` - List all facilities
- `POST /api/facilities` - Create facility (admin only)
- `GET /api/facilities/[id]` - Get single facility
- `PUT /api/facilities/[id]` - Update facility (admin only)
- `DELETE /api/facilities/[id]` - Delete facility (admin only)

### Upload

- `POST /api/upload` - Upload photo (admin only)

## Development

### Available Scripts

- `bun run dev` - Start dev server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run check` - Run type checking
- `bun run lint` - Run linter
- `bun run format` - Format code
- `bun run db:push` - Push schema to database
- `bun run db:generate` - Generate migrations
- `bun run db:studio` - Open Drizzle Studio

### Adding More Facility Types

Edit the `facilityTypeEnum` in `src/lib/server/db/schema.ts`:

```ts
export const facilityTypeEnum = pgEnum('FacilityType', [
	'SPORTS_PLAYGROUND',
	'CHILD_PLAYGROUND',
	'NTO',
	'TOILET',
	'CHILL',
	'CHILDREN_ROOM',
	'YOUR_NEW_TYPE' // Add here
]);
```

Then update the icons in `src/lib/components/Map.svelte`:

```ts
const facilityIcons = {
	// ...existing icons
	YOUR_NEW_TYPE: '🎯'
};
```

## Security Considerations

- Admin passwords are stored in environment variables (no registration)
- All write operations require authentication
- Photos are validated (type and size) before upload
- Session cookies are httpOnly and secure
- SQL injection prevented by Drizzle ORM's prepared statements

## Performance

- Marker clustering prevents map lag with many facilities
- No SSR for simpler deployment
- Lazy loading of map resources
- Optimized for low-traffic usage

## Future Enhancements

Some ideas for future improvements:

- Multiple admin accounts with roles
- Search and filter functionality
- Export data to CSV/GeoJSON
- Mobile app wrapper
- Analytics dashboard
- District management UI
- Batch import/export
- Offline support with PWA

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
