This project should allow marking parks and facilities inside them on a map.

For this, following functionality is required:

Creating areas on a map by placing vertexes. -- for parks
Putting down individual points. -- for facilities

Putting down parks and facilities means also adding info about them. You can find possible field in the schema file. Additionally, facilities can have a photo of them.

Click on parks or facilities should bring up info about them.

Adding or deleting things should require admin authorization. One admin account would be enough, no registration functionality needed.

Use clusters for map, so it would not lag.

Technical info:

Project uses drizzle, svelte 5 and would be hosted on a Vercel. For images, auth, database use everything that Vercel provides. No SSR is needed. Usage would be very low, requirements for performance and security are very low too. When deciding between an simpler solution or a better one, choose simpler.
