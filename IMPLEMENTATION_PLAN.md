# SAO Parks - Implementation Plan

## Project Overview

A web application for marking parks and facilities on an interactive map with admin-controlled editing capabilities.

## Current State

- ✓ SvelteKit 5 project configured with Vercel adapter
- ✓ Drizzle ORM set up with Neon PostgreSQL database
- ✓ Database schema defined (districts, parks, facilities)
- ✓ Tailwind CSS v4 integrated
- ✓ Basic project structure in place

## Technical Stack

- **Frontend**: SvelteKit 5 (CSR only, no SSR)
- **Styling**: Tailwind CSS v4
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Map Library**: Leaflet with Leaflet.markercluster
- **Image Storage**: Vercel Blob Storage
- **Authentication**: Simple admin session (single account)
- **Hosting**: Vercel

## Core Requirements

1. **Park Management**: Create areas by placing vertices (polygons)
2. **Facility Management**: Place individual point markers
3. **Information Display**: Click parks/facilities to view details
4. **Photo Support**: Facilities can have photos
5. **Admin Authorization**: Add/delete requires admin login
6. **Performance**: Clustering to prevent map lag

## Implementation Phases

### Phase 1: Infrastructure Setup

#### 1.1 Vercel Blob Storage Configuration

- Install `@vercel/blob` package
- Configure environment variables
- Test blob storage connection

#### 1.2 Authentication System

- Set up simple session-based auth or Vercel Auth
- Create admin credentials (single account)
- Implement session middleware
- No registration functionality needed

#### 1.3 Map Libraries Installation

- Install `leaflet` package
- Install `leaflet.markercluster` package
- Install type definitions
- Configure Vite for Leaflet CSS imports

### Phase 2: Map Core Functionality

#### 2.1 Main Map Component (`src/lib/components/Map.svelte`)

- Initialize Leaflet map
- Set up base tile layer (OpenStreetMap)
- Configure map view and zoom levels
- Handle Svelte 5 reactivity with map instance

#### 2.2 Park Polygon Drawing

- Integrate Leaflet.draw or custom polygon tool
- Allow vertex placement for creating park boundaries
- Enable polygon editing (move/add/remove vertices)
- Save geometry as GeoJSON in database
- Visual feedback during drawing

#### 2.3 Facility Marker Placement

- Implement single-click point placement
- Show marker preview
- Capture latitude/longitude coordinates
- Different marker icons based on facility type

#### 2.4 Marker Clustering Integration

- Configure Leaflet.markercluster
- Set clustering radius and thresholds
- Customize cluster icons
- Optimize for performance with many markers

### Phase 3: Data Management UI

#### 3.1 Park Form Component (`src/lib/components/ParkForm.svelte`)

- Fields: name, slug, description, area, district
- Geometry captured from map polygon
- Validation logic
- Save/Cancel buttons
- Admin-only access

#### 3.2 Facility Form Component (`src/lib/components/FacilityForm.svelte`)

- Fields from schema:
  - name, type (enum dropdown)
  - latitude, longitude (from map click)
  - photo (file upload)
  - description, area
  - mafCount, typeCoverage
  - contractAction, contractWith, contractTerm
- Photo preview
- Park association
- Validation logic
- Admin-only access

#### 3.3 Park Info Popup/Modal

- Display park details on click
- Show: name, description, area, district
- Visual boundary highlight
- Edit/Delete buttons (admin only)

#### 3.4 Facility Info Popup/Modal

- Display facility details on marker click
- Show: name, type, photo, all metadata
- Photo display
- Edit/Delete buttons (admin only)

### Phase 4: API Layer

#### 4.1 Park CRUD Endpoints

```
POST   /api/parks          - Create park
GET    /api/parks          - List all parks
GET    /api/parks/[id]     - Get single park
PUT    /api/parks/[id]     - Update park
DELETE /api/parks/[id]     - Delete park
```

#### 4.2 Facility CRUD Endpoints

```
POST   /api/facilities          - Create facility
GET    /api/facilities          - List all facilities
GET    /api/facilities/[id]     - Get single facility
PUT    /api/facilities/[id]     - Update facility
DELETE /api/facilities/[id]     - Delete facility
```

#### 4.3 Photo Upload Endpoint

```
POST   /api/upload              - Upload photo to Vercel Blob
```

- Accept multipart/form-data
- Validate file type (images only)
- Return blob URL
- Handle errors gracefully

#### 4.4 Authentication Endpoints

```
POST   /api/auth/login          - Admin login
POST   /api/auth/logout         - Admin logout
GET    /api/auth/session        - Check session status
```

### Phase 5: Security & Authorization

#### 5.1 Admin Login Page (`src/routes/admin/login/+page.svelte`)

- Simple username/password form
- Session creation on successful login
- Redirect to map on success
- Error handling

#### 5.2 Authorization Middleware

- Server hooks to verify admin session
- Protect all POST/PUT/DELETE endpoints
- Return 401/403 for unauthorized requests
- Allow GET requests for public viewing

#### 5.3 Client-Side Auth Guards

- Hide edit/delete UI for non-admin users
- Show login button when not authenticated
- Client-side route protection for admin pages

### Phase 6: Testing & Deployment

#### 6.1 Functionality Testing

- Test park creation with polygons
- Test facility creation with markers
- Verify info display on clicks
- Test photo upload and display
- Verify admin login/logout flow
- Test edit/delete operations

#### 6.2 Performance Testing

- Test with 100+ facility markers
- Verify clustering works correctly
- Check map responsiveness
- Monitor load times

#### 6.3 Vercel Deployment Configuration

- Set environment variables:
  - `DATABASE_URL` (Neon)
  - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
  - `AUTH_SECRET` (for sessions)
  - `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- Configure build settings
- Set up domains if needed
- Enable edge functions if beneficial

## Database Schema Reference

### Parks Table

- `id`: serial primary key
- `name`: text, required
- `slug`: text, unique, required
- `description`: text, optional
- `geometry`: json (GeoJSON polygon)
- `area`: double precision
- `districtId`: foreign key to districts
- `createdAt`, `updatedAt`: timestamps

### Facilities Table

- `id`: serial primary key
- `externalId`: text, optional
- `name`: text, required
- `type`: enum (SPORTS_PLAYGROUND, CHILD_PLAYGROUND, NTO, TOILET, CHILL, CHILDREN_ROOM)
- `latitude`, `longitude`: double precision, required
- `photo`: text (URL to Vercel Blob)
- `description`: text, optional
- `area`: text
- `mafCount`: integer
- `typeCoverage`: text
- `contractAction`: text
- `contractWith`: text
- `contractTerm`: text
- `parkId`: foreign key to parks (required, cascade delete)
- `createdAt`, `updatedAt`: timestamps

### Districts Table

- `id`: serial primary key
- `name`: text, unique, required
- `slug`: text, unique, required
- `geometry`: json (GeoJSON polygon)
- `createdAt`, `updatedAt`: timestamps

## Technical Considerations

### Map Interaction Flow

1. User clicks "Add Park" (admin only)
2. Activate polygon drawing mode
3. User places vertices by clicking map
4. Complete polygon (double-click or close button)
5. Open park form with geometry pre-filled
6. Submit form → API call → save to database
7. Render polygon on map

### Facility Creation Flow

1. User clicks "Add Facility" (admin only)
2. Activate marker placement mode
3. User clicks location on map
4. Open facility form with lat/lng pre-filled
5. User fills details and uploads photo
6. Submit form → API calls (photo upload, then facility create)
7. Add marker to cluster layer

### Authentication Strategy

- Keep it simple: single admin account
- Use SvelteKit hooks for server-side session validation
- Store session in cookies (httpOnly, secure)
- No JWT complexity needed for single user
- Option: Use Vercel KV for session storage or simple encrypted cookie

### Performance Optimization

- Marker clustering is essential
- Load facilities in viewport only (optional future enhancement)
- Lazy load facility photos
- Optimize polygon rendering for complex shapes
- Consider pagination for admin list views if data grows

## Development Workflow

1. Start with infrastructure (Phase 1)
2. Build map functionality incrementally (Phase 2)
3. Create UI components (Phase 3)
4. Implement API endpoints (Phase 4)
5. Add security layer (Phase 5)
6. Test and deploy (Phase 6)

## Success Criteria

- ✓ Admin can log in
- ✓ Admin can create/edit/delete parks with polygon boundaries
- ✓ Admin can create/edit/delete facilities with photos
- ✓ Public users can view map and click for information
- ✓ Map performs well with clustering (no lag)
- ✓ Photos display correctly
- ✓ Deployed successfully on Vercel
- ✓ Database operations work reliably

## Future Enhancements (Out of Scope)

- Multiple admin accounts
- User registration/roles
- Search functionality
- Filtering by facility type
- Export data features
- Mobile app
- Analytics dashboard
