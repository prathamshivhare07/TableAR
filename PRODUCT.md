# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Diner**: Restaurant guest scanning a physical QR code at their table. Seeks a fast, zero-friction, app-free dining experience: instant menu browsing, realistic 1:1 scale WebAR 3D food previews directly on their physical table, and swift ordering/checkout.
- **Restaurant Owner / Merchant Admin**: Hospitality operator managing menus, dish details, video/3D model uploads, table generation, QR code assets, live order tracking, and sales analytics.
- **Kitchen Staff**: Kitchen team operating a touch-first Kitchen Display System (KDS) kanban board in high-heat, high-glare, fast-paced commercial kitchen environments.
- **Super Admin**: Platform operator managing tenant onboarding and supervising the human-in-the-loop video-to-.glb 3D modeling pipeline.

## Product Purpose

Tabler.AR eliminates ordering anxiety and drives restaurant ticket size by replacing physical paper menus with instant, app-free browser QR ordering and photorealistic 1:1 WebAR 3D food visualizations projected directly onto the diner's table, connected in real-time to a live kitchen display system and merchant operations.

## Positioning

App-free, browser-native 1:1 WebAR 3D food previews powered by Google `<model-viewer>` with lightweight (<15MB) compressed assets and an integrated video-to-3D pipeline—delivering immersive table previews without forcing app downloads or specialized hardware.

## Operating Context

- **Dining Rooms**: Restaurant tables with physical QR codes, varying mobile network speeds, and varied indoor/outdoor lighting conditions.
- **Mobile Browsers**: iOS Safari (Quick Look / USDZ) and Android Chrome (Scene Viewer / WebXR) requesting camera permissions for AR placement.
- **Commercial Kitchens**: High-stress, noisy environments with tablet or wall-mounted touch displays running the real-time KDS.
- **Back Office**: Desktop and laptop browsers used by restaurant managers and super admins for menu management and 3D queue workflows.

## Capabilities and Constraints

- **Multi-Tenant Isolation**: Complete logical data separation using strict `tenant_id` filtering on all backend database queries.
- **Browser-Native 3D/AR**: Powered strictly by Google `<model-viewer>` web component with optimized `.glb` and `.usdz` formats under 15MB; no heavy three.js scenes.
- **Pluggable Asset Storage**: Supports Emergent storage and standard S3-compatible providers (Cloudflare R2, AWS S3, MinIO).
- **Real-Time Ticket Dispatch**: Native FastAPI WebSockets (`/api/ws/kds`) streaming new and updated orders with audio alerts.
- **Open Product Decision**: Diner checkout places orders directly into the KDS queue; payment gateway integration (e.g., Stripe) is planned for future iterations.

## Brand Commitments

- **Product Name**: Tabler.AR
- **Aesthetic Direction**: High-energy, food-forward warm palette anchored by hot orange (`#FC8019`), warm neutral surface tones (`#F9F8F6`), and a dedicated dark "command center" theme for the KDS (`#0A0A0A` / `#141414`).
- **Design Evolution**: Preserve current foundational layout and structure while actively refining towards a sleeker, modern hospitality standard (elevated craftsmanship, refined typography with Anton display and Manrope body, crisp contrast, and tactile micro-interactions).

## Evidence on Hand

- Fully functional FastAPI backend in `backend/server.py` with multi-tenant auth, public diner endpoints, merchant APIs, super-admin endpoints, and WebSocket broadcasting.
- React 19 frontend in `frontend/src/` with complete page surfaces: `LandingPage.jsx`, `DinerMenuPage.jsx`, `DashboardPage.jsx`, `KDSPage.jsx`, and `SuperAdminPage.jsx`.
- Pre-seeded demo tenant "Spice Route" (`demo@spice.co`) with sample dishes, 3D models, and tables.
- Confirmed design tokens and UX specs documented in `design_guidelines.json` and `memory/PRD.md`.

## Product Principles

1. **Zero-Friction Dining**: Diners must never be required to install an app or register an account; menus and WebAR 3D models must load instantly in the mobile browser.
2. **True Scale and Visual Truth**: 3D food visualizations must be 1:1 scale, mouth-watering, and accurate to minimize ordering hesitation and reduce return/complaint rates.
3. **Glanceable Kitchen Reliability**: Kitchen orders must transmit instantly over WebSockets with audible cues; the KDS must remain readable, touch-friendly, and rock-solid during peak service hours.
4. **Strict Tenant Separation**: Every merchant's menus, tables, tickets, and metrics are strictly isolated and protected across the entire pipeline.

## Accessibility & Inclusion

- High contrast on interactive elements (WCAG AA compliant contrast on orange buttons and dark KDS cards; avoiding gray-on-gray).
- Minimum 44px touch targets on mobile diner menus and tablet KDS interfaces.
- Distinct focus rings on inputs and buttons.
- Consistent `data-testid` attributes across all interactive components for testability.
