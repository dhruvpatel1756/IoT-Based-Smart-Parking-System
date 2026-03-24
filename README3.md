# ParkEase Interview Questions & Answers

**Created by Bhagya**

This document contains **100 technical interview questions** based on the ParkEase project. These questions cover System Design, Frontend (React), Backend (Supabase), and Security, designed to help you explain your project in depth during interviews.

---

## 1. Project Architecture & System Design (10 Questions)

**Q1: Can you explain the high-level architecture of ParkEase?**
**A:** ParkEase follows a Client-Server architecture. The **Client** is a Single Page Application (SPA) built with React and Vite, hosted on a CDN. The **Server** is a Backend-as-a-Service (BaaS) provided by Supabase, which handles Authentication, Database (PostgreSQL), Realtime subscriptions, and Storage.

**Q2: Why did you choose Supabase over Firebase?**
**A:** I chose Supabase because it is an open-source alternative to Firebase that uses a relational PostgreSQL database. This allows for complex relational queries (using Joins) which are essential for a booking system (Users <-> Bookings <-> Spots), unlike Firebase's NoSQL structure which can lead to data duplication.

**Q3: How does the parking search feature work?**
**A:** The frontend captures the user's location (lat/long) and sends a query to the Supabase database. We use PostGIS extensions in PostgreSQL to perform efficient geospatial queries to find parking spots within a specific radius of the user.

**Q4: How do you handle real-time updates for parking availability?**
**A:** We use Supabase Realtime. The client subscribes to changes on the `bookings` table. When a new booking is inserted, Supabase pushes an event to all connected clients via WebSockets, allowing the UI to update the spot status to "Occupied" instantly without polling.

**Q5: What is the purpose of the "Owner Dashboard"?**
**A:** The Owner Dashboard is a dedicated interface for parking spot owners to manage their inventory. It allows them to add new spots, view earnings, and scan QR codes to check drivers in and out. It uses Role-Based Access Control (RBAC) to ensure only authorized users can access it.

**Q6: How does the QR Code Check-in system work?**
**A:**
1. When a driver books a spot, a unique QR code containing the `booking_id` is generated.
2. The driver shows this code to the owner.
3. The owner scans it using the app's scanner (implemented with `html5-qrcode`).
4. The app verifies the `booking_id` against the database and updates the status to 'Active'.

**Q7: How do you handle user authentication and sessions?**
**A:** We use Supabase Auth (GoTrue). When a user logs in, they receive a JWT (JSON Web Token). This token is stored in the browser's Local Storage (or cookies) and is automatically attached to every database request to authenticate the user and apply Row Level Security (RLS) policies.

**Q8: Explain the database schema for the Booking system.**
**A:** The schema consists of three main tables:
- `profiles` (Users)
- `parking_spots` (Inventory)
- `bookings` (Transactions)
`bookings` has foreign keys referencing `profiles.id` (driver) and `parking_spots.id`. It also tracks `statuts` (pending, active, completed) and `start_time`/`end_time`.

**Q9: What measures did you take to make the application scalable?**
**A:**
- **Frontend**: Used Vite for optimized builds and code splitting.
- **Backend**: Supabase scales automatically. We utilize PostgreSQL indexes on frequently queried fields (like location) to maintain performance as data grows.
- **Caching**: React Query caches server data on the client to reduce API calls.

**Q10: What were the biggest challenges you faced while building this?**
**A:** One challenge was handling the complex state of the multi-step booking flow and ensuring data consistency between the client and server during real-time updates. I solved this by using `TanStack Query` for robust state management and optimistic UI updates.

---

## 2. Frontend (React, Vite, TypeScript) (30 Questions)

**Q11: Why Vite instead of Create React App (CRA)?**
**A:** Vite uses native ES modules for development, making it significantly faster than CRA, which bundles the entire application before starting. Vite also offers instant Hot Module Replacement (HMR) and optimized specific builds using Rollup.

**Q12: What is the benefit of using TypeScript in this project?**
**A:** TypeScript adds static typing, which helps catch errors at compile-time rather than runtime. For example, ensuring a `Booking` object always has a `start_time` property prevents crashes when accessing that property in the UI. It also provides better IntelliSense and auto-completion.

**Q13: Explain the folder structure of your React application.**
**A:**
- `src/components`: Reusable UI components (Buttons, Inputs).
- `src/pages`: Page components corresponding to routes.
- `src/hooks`: Custom React hooks (e.g., `useAuth`, `useBookings`).
- `src/lib`: Utility functions and Supabase client configuration.
- `src/Main.tsx`: Application entry point.

**Q14: How does React Router work in your app?**
**A:** React Router handles client-side routing. We define `Routes` in `App.tsx` that map URL paths (e.g., `/dashboard`) to React components. This allows users to navigate between pages without sending a request to the server or reloading the page.

**Q15: What is Context API and where did you use it?**
**A:** The Context API provides a way to share data like authentication state globally without passing props down manually at every level. I used it in `AuthProvider` to make the `user` object and `signOut` function available to any component in the app.

**Q16: Why use TanStack Query (React Query) instead of `useEffect` for fetching data?**
**A:** React Query handles caching, background updates, and stale data automaticallly. Using `useEffect` requires manual loading states (`isLoading`), error handling, and effect cleanup. React Query simplifies this to a single hook: `const { data, isLoading } = useQuery(...)`.

**Q17: How did you implement the "Protected Routes"?**
**A:** I created a wrapper component (or logic within `useEffect`) that checks if a `user` object exists in the Auth Context. If not, it redirects the user to the `/auth` page using `useNavigate`.

**Q18: Explain the `useAuth` custom hook.**
**A:** `useAuth` is a wrapper around the `useContext(AuthContext)`. It exposes the current user's session, profile data, and methods like `signIn` and `signOut`, allowing any component to access auth state with a single line of code.

**Q19: What UI library are you using and why?**
**A:** I used **Shadcn UI** combined with **Tailwind CSS**. Shadcn provides accessible, unstyled components that copy directly into the project, giving me full control over the code unlike a packaged library like Material UI. Tailwind allows for rapid, utility-first styling.

**Q20: How does the Map integration work?**
**A:** I used **React-Leaflet**, which wraps the Leaflet library. It renders a map component and places markers based on the lat/long coordinates of parking spots fetched from the database.

**Q21: What is "Prop Drilling" and how did you avoid it?**
**A:** Prop drilling is passing data through multiple layers of components that don't need it just to reach a child. I avoided it by using:
1. **Context API** for global state (Auth).
2. **React Query** which allows any component to fetch data directly without needing it passed down.
3. **Component Composition** (passing components as children).

**Q22: Explain the difference between `useState` and `useRef`.**
**A:** `useState` triggers a re-render when the value updates and is used for UI data. `useRef` persists values between renders *without* causing a re-render, useful for accessing DOM elements directly (like focusing an input).

**Q23: How did you optimize performance in React?**
**A:**
- **Code Splitting**: Lazy loading routes.
- **Memoization**: Using `useMemo` for expensive calculations and `useCallback` for functions passed to child components.
- **Virtualization**: If rendering large lists of parking spots, using a virtual list to render only visible items.

**Q24: What is the `useEffect` dependency array?**
**A:** It controls when the effect runs. An empty array `[]` means it runs, only once on mount. If variables are added (e.g., `[userId]`), the effect re-runs whenever `userId` changes. Omitting it runs the effect on every render.

**Q25: How do you handle form validation?**
**A:** I used **React Hook Form** combined with **Zod**. Zod defines the schema (e.g., "password must be 6 chars"), and React Hook Form manages the form state and validation, providing errors object to display feedback.

**Q26: What is the significance of `key` prop in lists?**
**A:** The `key` helps React identify which items have changed, added, or removed. It must be unique (like `spot.id`). Using an index is discouraged if the list order can change, as it can lead to bugs with component state.

**Q27: How would you handle a 404 Not Found page?**
**A:** In React Router, I added a catch-all route `<Route path="*" element={<NotFound />} />` at the end of the routes list. If no other route matches, this component renders.

**Q28: How do you manage Global State?**
**A:**
- **Server State**: Managed by React Query (bookings, spots).
- **Client State**: Content API (Auth).
- **Local State**: `useState` (form inputs, modals).
I didn't need Redux because this separation covers most needs with less boilerplate.

**Q29: What are React Fragments `<>...</>`?**
**A:** They allow grouping a list of children without adding extra nodes (like `<div>`) to the DOM, keeping the HTML structure clean.

**Q30: How did you implement Dark Mode?**
**A:** Using Tailwind's `dark` class strategy. A theme provider (Context) toggles a class on the `<html>` element, and Tailwind automatically applies styles prefixed with `dark:` (e.g., `dark:bg-slate-900`).

**Q31: Explain the purpose of `custom hooks`.**
**A:** Custom hooks allow extracting component logic into reusable functions. For example, `useParkingSpots` creates a hook that handles fetching spots, loading states, and errors, keeping the UI component clean.

**Q32: What is JSX?**
**A:** JSX is a syntax extension for JavaScript that looks like HTML. It allows us to write UI structure directly within JavaScript logic. It is compiled to `React.createElement()` calls.

**Q33: How do you secure data on the Frontend?**
**A:** **We cannot.** Any logic on the frontend can be bypassed. The frontend only *displays* data. Security must be enforced on the backend (Supabase RLS). We only hide UI elements (like Admin buttons) for UX, not security.

**Q34: What is "Lifting State Up"?**
**A:** Moving shared state to the closest common ancestor of two components that need it. For example, if a Filter component controls the Map's display, the state lives in the parent Page component and is passed down to both.

**Q35: Explain strict mode in React.**
**A:** `<React.StrictMode>` is a developer tool that highlights potential problems. It runs effects twice in verification to find bugs caused by impure side effects.

**Q36: How do you handle API errors?**
**A:** By using `try/catch` blocks (or React Query's `isError` property) and displaying user-friendly toast notifications (using Sonner) instead of crashing the app.

**Q37: What is Tailwind's "Utility-First" approach?**
**A:** Instead of writing custom CSS classes like `.btn-primary`, we use pre-defined utility classes like `bg-blue-500 px-4 py-2`. This speeds up development and ensures design consistency.

**Q38: Why use `lucide-react` for icons?**
**A:** It's a lightweight library that exports icons as React components, allowing easy customization of size, color, and stroke width via props, and it treeshakes well (only bundles used icons).

**Q39: How do you debug React apps?**
**A:** Using React Developer Tools (browser extension) to inspect component hierarchy and props/state, and the Network tab to debug API requests.

**Q40: Differences between `Link` vs `<a>` tag?**
**A:** `<a>` triggers a full page reload. `Link` (from React Router) uses the History API to change the URL and render the new component without reloading the page, preserving state.

---

## 3. Backend & Database (Supabase, PostgreSQL) (30 Questions)

**Q41: What is Supabase?**
**A:** Supabase is an open-source Firebase alternative. It provides a suite of tools wrapping a PostgreSQL database: Auth, Auto-generated APIs (PostgREST), Realtime, and Storage.

**Q42: What is PostgREST?**
**A:** PostgREST is a web server that turns the PostgreSQL database directly into a RESTful API. Supabase uses this to allow the frontend to query the database (e.g., `supabase.from('spots').select('*')`) without writing a custom Node.js backend layer.

**Q43: Explain "Relational" Database.**
**A:** Data is stored in tables with defined columns and relationships. For example, a `booking` row relates to a `user` row via `user_id`. This ensures data integrity compared to accurate redundancy in NoSQL.

**Q44: What is a Foreign Key?**
**A:** A constraint that links two tables. In `bookings`, `user_id` is a foreign key pointing to `profiles.id`. It ensures a booking cannot exist without a valid user.

**Q45: How did you implement Auth with Supabase?**
**A:** I enabled the Email/Password provider in the Supabase Dashboard. The frontend uses the Supabase client SDK: `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`. Supabase handles the session management and secure storage of hashed passwords.

**Q46: What is a "Policy" in Supabase?**
**A:** It refers to Row Level Security (RLS) policies. They are SQL rules that determine if a user can Read, Insert, Update, or Delete a specific row. Ideally, "Users can only see their own bookings".

**Q47: Why is PostgreSQL considered better than MySQL for this?**
**A:** PostgreSQL has advanced features like native JSON support and, crucially for this project, **PostGIS** for geospatial queries (calculating distances between coordinates), which is superior to MySQL's implementation.

**Q48: What is a Trigger in PostgreSQL?**
**A:** A function that runs automatically before or after a database event. I used a trigger to automatically create a `profiles` entry whenever a new user is created in the `auth.users` table.

**Q49: How do you backup your data?**
**A:** Supabase (and most cloud Postgres providers) manages automatic daily backups. We can also manually dump the database schema and data using `pg_dump` via the CLI.

**Q50: Explain the "Realtime" feature.**
**A:** PostgreSQL creates a replication stream (WAL). Supabase Realtime listens to this stream and broadcasts changes to subscribed clients over WebSockets. This allows the dashboard to show new bookings instantly.

**Q51: What format is data returned in?**
**A:** JSON. Even though Postgres is relational, the PostgREST layer automatically converts the SQL result set into a JSON array for the frontend.

**Q52: How did you handle file uploads?**
**A:** Using Supabase Storage. I created a "Bucket" for images. The frontend uploads the file using `supabase.storage.from('images').upload()`, gets a public URL, and saves that URL string in the database.

**Q53: What is "Normalizaton"?**
**A:** The process of organizing data to reduce redundancy. Instead of storing the "User Name" in every booking, we store `user_id` and look up the name in the `users` table.

**Q54: How do you perform a "Join" with Supabase client?**
**A:** Using the `select` syntax with nested resources. E.g., `supabase.from('bookings').select('*, profiles(*)')` fetches bookings AND the related profile data in one request.

**Q55: What are Database "Views"?**
**A:** A view is a virtual table based on a SQL query. I could use a view to show "Active Bookings" by filtering the main table, making it easier to query from the frontend.

**Q56: How do you handle migrations?**
**A:** Migrations are files that track changes to the database schema (e.g., "create table"). Supabase uses a CLI to manage this. We run `supabase db diff` to generate migration files and apply them to production.

**Q57: What is UUID?**
**A:** Universally Unique Identifier. We use `UUID`s for primary keys (ids) instead of auto-incrementing integers (1, 2, 3) because they are unique across systems and don't reveal how many records we have (security by obscurity).

**Q58: Explain the `profiles` table pattern.**
**A:** Supabase stores auth credentials in a secure system table (`auth.users`) we can't edit. To store app data like "Phone Number" or "Avatar", we create a public `profiles` table linked 1-to-1 with `auth.users`.

**Q59: What is "Indexing"?**
**A:** An index is a data structure that improves the speed of data retrieval. I added an index on `parking_spots.location` to make search queries faster.

**Q60: Difference between `INNER JOIN` and `LEFT JOIN`?**
**A:**
- `INNER JOIN`: Returns rows when there is a match in BOTH tables (Only bookings with a valid user).
- `LEFT JOIN`: Returns all rows from the left table, even if there is no match in the right (All bookings, even if the user was deleted).

**Q61: What are Stored Procedures (RPC)?**
**A:** SQL functions stored in the database. We can call them from the frontend via `supabase.rpc('function_name')`. This is useful for complex logic (like "CheckIn") that should run as a single atomic transaction on the server.

**Q62: How does Supabase handle scalability?**
**A:** It's built on AWS structures. The database can be vertically scaled (bigger server), and read replicas can be added. The API layer (PostgREST) is stateless and scales horizontally.

**Q63: What happens if the internet cuts out?**
**A:** Supabase client has offline support (if configured). React Query also caches data so the user can still see loaded content. However, new bookings will fail until reconnected.

**Q64: How did you secure the Storage buckets?**
**A:** Using Storage Policies (similar to RLS). I created a policy stating "Anyone can READ images", but "Only Authenticated Users can UPLOAD images".

**Q65: What is a "Composite Key"?**
**A:** A primary key made of two columns. For example, a "UserFavorites" table might use `(user_id, spot_id)` as the key to ensure a user can't favorite the same spot twice.

**Q66: How do you handle UTC vs Local Time?**
**A:** The database stores all timestamps in UTC (`timestamptz`). The Frontend converts this to the user's local time using `new Date().toLocaleString()` or libraries like `date-fns`.

**Q67: What is the `service_role` key?**
**A:** It is a secret admin key that bypasses all RLS policies. It is NEVER used in the frontend. It's used only in backend scripts or edge functions for admin tasks.

**Q68: How do you handle "Soft Delete"?**
**A:** Instead of `DELETE FROM`, we add a column `is_deleted` (boolean). Updating this to `true` hides the record from the UI but keeps the data for analytics/history.

**Q69: What is Connection Pooling?**
**A:** Opening a DB connection is expensive. Supabase (via PgBouncer) maintains a pool of open connections and reuses them for incoming requests, allowing thousands of concurrent users.

**Q70: How do you query specific columns?**
**A:** `supabase.from('users').select('id, name')`. This reduces bandwidth by not fetching unnecessary data (like large bio text) when listing users.

---

## 4. Security (SQL Injection, RLS, XSS) (15 Questions)

**Q71: How is this application protected against SQL Injection?**
**A:** We use the Supabase Client SDK, which uses parameterized queries under the hood. We never construct SQL strings manually (e.g., `SELECT * FROM users WHERE name = '` + input + `'`). The SDK treats input strictly as data, not executable code, neutralizing injection attacks.

**Q72: What is XSS (Cross-Site Scripting) and how does React prevent it?**
**A:** XSS is injecting malicious scripts into a web page. React prevents this by "escaping" all data rendered in JSX. If a user tries to set their name to `<script>alert(1)</script>`, React renders it as plain text, not HTML.

**Q73: Explain Row Level Security (RLS) in detail.**
**A:** RLS is a PostgreSQL feature. It acts as a firewall for each row.
- Without RLS: `SELECT * FROM bookings` returns ALL bookings.
- With RLS policy `auth.uid() = user_id`: The database *automatically* filters the results to return ONLY rows where the `user_id` matches the currently logged-in user. This ensures data isolation at the engine level.

**Q74: Why shouldn't we store secrets in the frontend?**
**A:** Anything in the frontend code is visible to the user via "View Source". API Keys (like `service_role`) stored there can be stolen and used to wipe the database. We only store the "Anon Key", which is safe because it is restricted by RLS.

**Q75: What is CSRF (Cross-Site Request Forgery)?**
**A:** An attack where a malicious site tricks a user's browser into sending a request to your app (e.g., "Delete Account"). Supabase Auth uses SameSite cookies and JWTs in headers, which mitigate this standard browser vulnerability.

**Q76: How do you secure the Admin Dashboard?**
**A:**
1. **Frontend**: Checks `if (user.role !== 'admin') return <Redirect />`. This is just UX.
2. **Backend (Critical)**: RLS policies on admin tables state `CREATE POLICY "Admins only" ON "admin_logs" USING (get_my_role() = 'admin')`. Even if a hacker forces an API call, the DB rejects it.

**Q77: What is "Principle of Least Privilege"?**
**A:** Giving a user only the access they strictly need. A driver can `SELECT` parking spots but cannot `UPDATE` them. Only owners can `UPDATE`. We implement this via RLS policies.

**Q78: How do you handle password security?**
**A:** We never store plain-text passwords. Supabase Auth hashes them (using bcrypt or argon2) before storing. Even if the DB is leaked, the original passwords remain unknown.

**Q79: Is the "Anon Key" in Supabase a security risk?**
**A:** No. The Anon Key allows connection to the DB but doesn't grant permissions. It relies on RLS. If RLS is disabled, THEN it is a risk. RLS must always be enabled.

**Q80: What is Man-In-The-Middle (MITM) attack protection?**
**A:** Using **HTTPS** (SSL/TLS). This encrypts the data between the client and Supabase, so no one on the public WiFi can read the password or token passing through the network.

**Q81: How do you sanitise user input?**
**A:** React sanitizes output. Zod (schema validation) sanitizes input by rejecting invalid data types or lengths before it even reaches the API.

**Q82: What is Rate Limiting?**
**A:** Limiting the number of requests a user can make in a minute. Supabase has built-in API rate limits to prevent DDoS attacks.

**Q83: Secure Cookies vs LocalStorage?**
**A:** LocalStorage is vulnerable to XSS (scripts can read it). `HttpOnly` Cookies are safer for tokens as scripts cannot read them, preventing token theft. (Supabase supports both).

**Q84: How do you handle broken authentication logic?**
**A:** By using a battle-tested provider (Supabase Auth/GoTrue) instead of writing custom login logic, which is prone to edge-case bugs.

**Q85: What is IDOR (Insecure Direct Object Reference)?**
**A:** When a user changes an ID in the URL (`/booking/123` -> `/booking/124`) to see someone else's booking. RLS prevents this completely; the database returns 0 rows for ID 124 if it doesn't belong to you.

---

## 5. Performance & Optimization (15 Questions)

**Q86: How did you optimize the "Landing Page" load time?**
**A:**
- **Image Optimization**: Using WebP format and lazy loading (`loading="lazy"`) for images below the fold.
- **Minification**: Vite minifies JS and CSS files during build.

**Q87: What is "Debouncing" in the Search bar?**
**A:** When a user types "New York", we don't fire an API call for 'N', 'Ne', 'New'. We wait for 300ms of inactivity (debounce) before sending *one* request. This reduces server load and API usage.

**Q88: Explain "Lazy Loading" regarding Routes.**
**A:** Using `React.lazy()` and `Suspense`. The code for "Admin Dashboard" is not downloaded by a normal user. It is fetched only when the user navigates to `/admin`. This reduces the initial bundle size.

**Q89: How does "Memoization" help performance?**
**A:** `useMemo` caches the result of a heavy calculation (e.g., filtering 1000 markers). If the list hasn't changed, React skips the calculation on re-renders.

**Q90: What is the "Network Waterfall" problem?**
**A:** Fetching User -> wait -> Fetch Booking -> wait -> Fetch Spot. This is slow.
**Solution**: Use `Promise.all` or React Query's parallel fetching to start all requests simultaneously.

**Q91: How does CDN help?**
**A:** A Content Delivery Network caches static files (HTML, CSS, Images) in servers globally. A user in India downloads the app from an Indian server, not the US origin, reducing latency.

**Q92: Optimistic UI Updates?**
**A:** When a user clicks "Book", the UI updates immediately to "Booked!" *before* the server responds. This makes the app feel snappy. If the server fails, we revert the change and show an error.

**Q93: Reducing Re-renders?**
**A:** Analyzing components with React DevTools Profiler. If a parent renders, children render. We use `React.memo()` to wrap child components so they only render if their *specific props* change.

**Q94: Database Query Optimization?**
**A:**
- Selecting only needed fields (`.select('id')`).
- Pagination (fetching 10 rows at a time, not 1000).
- Using filters on the server side (RLS), not filtering in the browser.

**Q95: Bundle Size Analysis?**
**A:** Using `rollup-plugin-visualizer` to see which libraries are huge. I replaced `moment.js` (large) with `date-fns` (modular/small) to save space.

**Q96: Tree Shaking?**
**A:** A build process that removes unused code. If I import `{ Button }` from a library, Vite ensures the code for `Slider` is not included in the final bundle.

**Q97: Pre-fetching?**
**A:** When the user hovers over the "Dashboard" link, we can start fetching the dashboard data in the background so it's ready instantly when they click.

**Q98: Efficient List Validation?**
**A:** Using `Virtualization` (React Window). If a list has 1000 items, we only render the 10 visible on screen. The DOM stays light.

**Q99: CLS (Cumulative Layout Shift)?**
**A:** Preventing page jumping. I defined fixed heights for images and placeholders (Skeleton loaders) so the layout doesn't shift when data loads.

**Q100: How do you measure performance?**
**A:** using Google Lighthouse. It gives scores on LCP (Largest Contentful Paint), FID (First Input Delay), and CLS. I improved these scores by optimizing fonts and critical CSS.
