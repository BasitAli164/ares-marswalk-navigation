
# ARES – MarsWalk Navigation System

### Production v0.2 | Mars Surface Navigation & Mission Planning

ARES (MarsWalk Navigation System) is a browser-based Mars surface navigation and mission-planning application designed to help users explore potential routes across the Martian surface.

The system combines interactive planetary mapping, route planning, terrain analysis, EVA (Extra-Vehicular Activity) estimation, round-trip mission calculations, and a Generative AI-powered assistant in one interface.

ARES provides two route-planning approaches, FAST and SAFE, allowing users to compare distance-oriented navigation with terrain-aware route selection. It also maintains structured mission information so the AI assistant can answer questions using the current mission context.

> **Project Scope:** ARES is a research and demonstration prototype for Martian surface navigation. Its SAFE routing mode provides terrain-aware route recommendations, not certified astronaut-safety guarantees.

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Key Features](#4-key-features)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture](#6-system-architecture)
7. [Route Planning Methodology](#7-route-planning-methodology)
8. [Terrain Hazard Assessment](#8-terrain-hazard-assessment)
9. [Mission Planning and EVA Calculations](#9-mission-planning-and-eva-calculations)
10. [ARES AI Assistant](#10-ares-ai-assistant)
11. [Phase 2 – Mission Context Integration](#11-phase-2--mission-context-integration)
12. [Project Structure](#12-project-structure)
13. [Data Sources and Attribution](#13-data-sources-and-attribution)
14. [Installation and Local Setup](#14-installation-and-local-setup)
15. [Deployment](#15-deployment)
16. [Testing and Validation](#16-testing-and-validation)
17. [Known Limitations](#17-known-limitations)
18. [Future Improvements](#18-future-improvements)
19. [Contributors](#19-contributors)

---

# 1. Project Overview

ARES is designed around a central challenge of future Mars exploration: helping astronauts understand and evaluate potential surface routes while considering terrain conditions, travel distance, elevation changes, and mission-duration constraints.

Unlike conventional road-navigation applications, Mars surface navigation must account for an unstructured environment without an established road network or conventional GPS infrastructure.

ARES addresses this problem through an interactive Mars mapping interface and a collection of computational tools that support route planning and mission analysis.

Users can:

- Explore the Martian surface through an interactive map.
- Select starting points and destinations.
- Save and manage selected locations.
- Generate FAST and SAFE route candidates.
- Inspect route distance and terrain characteristics.
- Evaluate slope-based terrain hazard statistics.
- Estimate EVA travel duration.
- Plan independent outbound and return journeys.
- Review combined round-trip mission statistics.
- Compare estimated EVA duration against a configurable time limit.
- Ask the ARES AI assistant questions about the active mission.

---

# 2. Problem Statement

Mars exploration presents several navigation challenges:

- **Unstructured Surface:** The Martian surface contains elevation variations, slopes, craters, and other geographical features.
- **Terrain Assessment:** The shortest geographical route may not be the most suitable route when terrain conditions are considered.
- **Route Selection:** Navigation requires balancing distance and terrain characteristics.
- **EVA Constraints:** Astronauts operate within limited Extra-Vehicular Activity time windows.
- **Round-Trip Planning:** Return journeys may have different elevation profiles and terrain conditions from outbound journeys.
- **Mission Information:** Users need an accessible way to interpret route statistics, terrain assessments, and mission-level information.

ARES aims to bring these navigation and mission-planning considerations into a single interactive platform.

---

# 3. Project Objectives

The primary objectives of ARES are:

1. Develop an interactive Mars surface navigation interface.
2. Enable users to select locations and destinations on Mars.
3. Implement distance-oriented FAST routing.
4. Implement terrain-aware SAFE routing.
5. Analyze route elevation and slope characteristics.
6. Estimate route distance and EVA duration.
7. Calculate elevation gain and maximum route slope.
8. Classify terrain samples into hazard categories.
9. Support independent outbound and return route calculations.
10. Calculate combined round-trip mission statistics.
11. Support configurable EVA time-limit evaluation.
12. Integrate a Generative AI assistant with access to current mission information.

---

# 4. Key Features

## 4.1 Interactive Mars Map

ARES provides an interactive planetary mapping interface powered by the ArcGIS Maps SDK for JavaScript.

Users can interact with the Mars surface, select locations, define navigation endpoints, and visualize route candidates.

## 4.2 Location and Waypoint Management

The application supports selecting and managing saved locations.

Saved places are maintained using browser local storage, allowing the application to retain user-selected locations between page visits on the same browser.

## 4.3 FAST Route Planning

FAST mode focuses on generating a distance-oriented route candidate between the selected locations.

It prioritizes a comparatively direct surface path and reports available terrain metrics for the generated route.

## 4.4 SAFE Route Planning

SAFE mode evaluates terrain characteristics when generating a route candidate.

It uses elevation and slope information from the available Mars elevation service to assess nearby route corridors and select a lower-cost terrain-aware path.

The purpose is to consider terrain conditions rather than relying exclusively on geographical distance.

**Important:** SAFE is a heuristic terrain-aware routing approach. It does not guarantee the physically safest route or account for every possible surface hazard.

## 4.5 Route Statistics

For calculated routes, ARES provides important navigation metrics:

- Route distance (km).
- Estimated EVA duration.
- Maximum route slope (degrees).
- Elevation gain / ascent (metres).
- Routing mode.

## 4.6 Terrain Hazard Assessment

ARES evaluates sampled route locations using slope information.

Terrain samples are classified into three project-defined categories:

| Category | Slope Range |
|---|---|
| Low | Below 5° |
| Moderate | 5° to below 12° |
| High | 12° or greater |

The system reports:

- Low-slope sample count.
- Moderate-slope sample count.
- High-slope sample count.
- Total assessed samples.
- Skipped samples.
- Maximum sampled slope.

These categories provide simplified terrain indicators and should not be interpreted as official NASA astronaut-safety classifications.

## 4.7 One-Way Mission Planning

ARES supports one-way navigation from a selected starting point to a destination.

The system generates a route and calculates its associated mission statistics and terrain assessment.

## 4.8 Round-Trip Mission Planning

ARES supports independent outbound and return route calculations.

The system calculates:

- Outbound route distance.
- Return route distance.
- Outbound EVA duration.
- Return EVA duration.
- Outbound elevation gain.
- Return elevation gain.
- Maximum route slope.
- Individual terrain hazard counts.
- Combined terrain hazard statistics.
- Total mission distance.
- Total estimated EVA duration.
- Total elevation gain.

The return journey is evaluated independently rather than assuming that it has identical terrain characteristics to the outbound journey.

## 4.9 EVA Time-Limit Evaluation

ARES supports a configurable EVA time limit.

The application compares estimated mission travel duration against the configured limit to help users understand whether a planned journey fits within the selected time constraint.

---

# 5. Technology Stack

ARES combines frontend development, geographic information systems, terrain data, backend APIs, and Generative AI.

| Technology | Purpose |
|---|---|
| HTML5 | Application structure and interface components |
| CSS3 | Styling, responsive layouts, and visual presentation |
| JavaScript (ES Modules) | Application logic, route calculations, mission management, and map interactions |
| ArcGIS Maps SDK for JavaScript | Interactive Mars mapping and geographic visualization |
| Mars Digital Elevation Model (MDEM) | Terrain elevation information |
| Node.js | Backend JavaScript runtime |
| Express.js | API endpoints and backend request handling |
| Groq API | Generative AI model access |
| OpenAI GPT-OSS-20B | Language model used by the ARES assistant |
| Vercel | Frontend and serverless backend deployment |
| Git | Version control |
| GitHub | Source-code hosting and collaboration |
| Browser Local Storage | Persistence of saved locations |

### Development Approach

The frontend uses native JavaScript modules rather than requiring a frontend framework.

The application is organized into separate modules for configuration, state management, route calculations, hazard assessment, round-trip planning, and AI communication.

The backend uses Express.js and communicates with the Groq API through server-side requests.

---

# 6. System Architecture

ARES follows a modular frontend-backend architecture.

## Frontend Layer

The frontend is developed with HTML5, CSS3, and JavaScript ES Modules.

It manages:

- User interface.
- Interactive Mars map.
- Location selection.
- Route visualization.
- FAST and SAFE modes.
- Mission statistics.
- Terrain hazard information.
- Round-trip planning.
- ARES AI chat interface.

## Geographic and Terrain Layer

The geographic layer uses the ArcGIS Maps SDK for JavaScript.

The application uses an ArcGIS-hosted Mars elevation service to obtain terrain elevation information for route-related analysis.

## Mission Processing Layer

Dedicated JavaScript modules manage:

- Route calculations.
- Terrain hazard assessment.
- One-way mission information.
- Round-trip mission calculations.
- EVA time-limit evaluation.
- Mission context synchronization.

## Backend Layer

The backend is developed using Node.js and Express.js.

It provides API endpoints for:

- AI chat requests.
- Health checks.
- Mission-context processing.
- Groq API communication.

## AI Layer

The ARES AI assistant uses the Groq API with the OpenAI GPT-OSS-20B model.

The frontend sends the user's messages and current mission snapshot to the backend. The backend validates and sanitizes mission information before passing the relevant context to the language model.

---

# 7. Route Planning Methodology

ARES provides two distinct routing approaches.

## FAST Mode

FAST mode is designed for distance-oriented route generation.

Its purpose is to identify a comparatively direct surface route between the selected locations.

## SAFE Mode

SAFE mode considers terrain-related information during route selection.

The application evaluates nearby route corridors using available elevation and slope information and selects a lower-cost terrain-aware candidate.

The route summary can include:

- Distance.
- Estimated EVA duration.
- Maximum slope.
- Elevation gain.
- Routing mode.

### FAST vs SAFE

| Aspect | FAST | SAFE |
|---|---|---|
| Primary objective | Distance-oriented planning | Terrain-aware planning |
| Terrain information | Used for available route metrics | Used in route evaluation |
| Slope consideration | Reported when available | Considered during route selection |
| Elevation consideration | Reported when available | Considered during route evaluation |
| Main purpose | Direct route candidate | Terrain-aware route candidate |

The two modes are intended to demonstrate the trade-off between route efficiency and terrain characteristics.

---

# 8. Terrain Hazard Assessment

Terrain hazard assessment is performed using sampled route locations and slope information.

The hazard assessment module evaluates route samples and calculates the number of locations falling into each slope category.

### Thresholds

- Low: slope below 5 degrees.
- Moderate: slope from 5 degrees to below 12 degrees.
- High: slope of 12 degrees or greater.

### Assessment Statistics

The application reports:

- Low hazard samples.
- Moderate hazard samples.
- High hazard samples.
- Assessed samples.
- Skipped samples.
- Maximum sampled slope.

### Round-Trip Hazard Assessment

For round-trip missions, outbound and return terrain assessments are calculated independently.

The system also provides combined statistics to summarize the terrain assessment across both journeys.

**Data interpretation:** These are slope-based analytical categories, not comprehensive physical hazard predictions.

---

# 9. Mission Planning and EVA Calculations

ARES estimates travel duration using route distance and the configured EVA travel-speed assumption.

The application uses the following project configuration:

- Mars radius: 3,389.5 km.
- EVA travel speed: 2.2 km/h.
- Mars spatial reference: WKID 104971.

These are application-level assumptions and configuration values, not a complete model of astronaut movement.

### Mission Types

**One-Way Mission**

Calculates route information from the starting location to the destination.

**Round-Trip Mission**

Calculates outbound and return routes independently and combines their statistics.

### Combined Mission Statistics

For round-trip missions:

- Total distance = outbound distance + return distance.
- Total EVA duration = outbound duration + return duration.
- Total ascent = outbound ascent + return ascent.
- Overall maximum route slope = the greater of the outbound and return maximum route slopes.

Terrain hazard counts are also combined across the two assessed legs.

---

# 10. ARES AI Assistant

ARES includes a Generative AI-powered assistant designed to help users understand route information and mission statistics through natural-language interaction.

### AI Technology

- API Provider: Groq.
- Model: OpenAI GPT-OSS-20B.
- Backend: Node.js and Express.js.
- Communication: HTTP API requests with JSON payloads.

### Assistant Capabilities

Users can ask questions about:

- Current mission status.
- Current route mode.
- Route distance.
- Estimated EVA duration.
- Maximum route slope.
- Elevation gain.
- Terrain hazard counts.
- Outbound and return route comparisons.
- Combined round-trip statistics.
- EVA time-limit evaluation.
- Differences between FAST and SAFE routing.

### Context-Aware Responses

The assistant receives structured mission information from the frontend rather than relying exclusively on the user's written messages.

The backend prepares and sanitizes the supplied mission snapshot before including it in the AI request.

The assistant is instructed to:

- Use the available mission values.
- Avoid inventing missing numerical information.
- Distinguish unavailable data from zero values.
- Identify incomplete terrain assessments.
- Compare outbound and return statistics when available.
- Explain the difference between FAST and SAFE modes.

The assistant is intended to make technical mission information easier to understand.

**Important:** The AI assistant interprets application-provided information. It does not independently verify planetary measurements or certify route safety.

---

# 11. Phase 2 – Mission Context Integration

Phase 2 introduced structured mission-context integration between the navigation system and the ARES AI assistant.

The objective was to allow the chatbot to understand the current application mission rather than responding only to general questions.

## Mission Context Module

A dedicated JavaScript module named `missionContext.js` was introduced.

It maintains a structured, serializable snapshot of the active mission.

The context can contain:

- Mission type.
- Mission status.
- Route mode.
- Starting location.
- Destination.
- Outbound route metrics.
- Return route metrics.
- Combined mission statistics.
- Terrain hazard information.
- EVA time limit.
- EVA speed assumption.
- Mission timestamp.

## Context Management Functions

The module provides functions for managing mission information:

| Function | Purpose |
|---|---|
| `setMissionContext()` | Sets the current mission snapshot |
| `updateMissionHazards()` | Updates terrain hazard information |
| `updateMissionEVALimit()` | Updates the EVA time-limit information |
| `markMissionCalculating()` | Marks a mission as being calculated |
| `getMissionContext()` | Retrieves the current mission snapshot |
| `clearMissionContext()` | Clears the current mission context |

## Integration with Application Modules

Mission context was integrated with:

- `routes.js`
- `roundTrip.js`
- `hazards.js`
- `assistant.js`
- `server.js`

The route and hazard modules update the mission snapshot as calculations progress.

The assistant module retrieves the current context and includes it in the backend request.

The backend validates and sanitizes the supplied context before sending it to the language model.

## Phase 2 Benefits

- The assistant can answer questions about the current mission.
- One-way and round-trip missions can be distinguished.
- FAST and SAFE route modes can be identified.
- Outbound and return statistics can be compared.
- Hazard assessments can be interpreted in mission context.
- Missing or incomplete values can be handled more carefully.
- The assistant is less dependent on users manually providing route statistics.

This phase connects the navigation calculations with the conversational interface and makes ARES more context-aware.

---

# 12. Project Structure

The application uses a modular JavaScript architecture.

The following are the major logical modules and responsibilities:

| Module | Responsibility |
|---|---|
| `config.js` | Shared configuration values and constants |
| `state.js` | Application state management |
| `routes.js` | Route planning and one-way route calculations |
| `roundTrip.js` | Independent outbound and return calculations |
| `hazards.js` | Terrain hazard assessment |
| `missionContext.js` | Structured mission snapshot management |
| `assistant.js` | Frontend AI assistant API communication |
| `server.js` | Express backend and Groq API integration |

The application also contains HTML and CSS files for the user interface, along with supporting assets such as the ARES logo.

> The table describes the major modules involved in the project. It is not intended to be a complete directory listing of every asset and source file.

---

# 13. Data Sources and Attribution

ARES uses an ArcGIS-hosted Mars elevation service for terrain-related calculations.

### Current Elevation Service

**Service:** `OnMars/MDEM200M`

**Provider / Attribution:** NASA / ESA / HRSC / GSFC / USGS / Esri.

This is a global Mars terrain product used by the application for elevation-related analysis and terrain-aware route evaluation.

### Data Resolution and Limitations

The current global elevation product is coarser than the Jezero-specific CTX and HiRISE Digital Elevation Models (DEMs) that may be used in future development.

Therefore:

- SAFE routing is based on real terrain-derived elevation information.
- Terrain analysis depends on the resolution and coverage of the current elevation service.
- The current model is not a final high-resolution astronaut-scale terrain model.
- Fine-scale surface hazards may not be represented in the available data.

### NASA and USGS Reference Resources

The following official resources provide scientific and planetary mapping context for the project.

**NASA Mars Trek**

https://trek.nasa.gov/mars/

**NASA Perseverance Raw Images**

https://mars.nasa.gov/mars2020/multimedia/raw-images/

**NASA Wildcat Ridge Science Reference**

https://science.nasa.gov/resource/sample-collection-and-rock-analysis-at-wildcat-ridge/

**USGS Jezero Crater CTX DEM Mosaic**

https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic

**Important data-provenance distinction:** These reference resources should not all be interpreted as directly integrated application services. The currently documented terrain service is `OnMars/MDEM200M`. Additional NASA and USGS resources provide scientific context and potential future data sources.

---

# 14. Installation and Local Setup

## Prerequisites

- A modern web browser.
- Python 3 (for serving the frontend locally).
- Node.js (for backend development).
- npm.
- A Groq API key for AI assistant functionality.

## Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Replace the placeholders with the actual repository URL and directory name.

## Run the Frontend Locally

ARES is a browser-based application. The frontend can be served using Python's built-in HTTP server.

```bash
python3 -m http.server 8000
```

On Windows, you can also use:

```bash
python -m http.server 8000
```

Open:

http://localhost:8000

## Backend Configuration

The backend uses Node.js and Express.js.

Configure the Groq API key in the backend environment.

Example environment variable:

```env
GROQ_API_KEY=your_groq_api_key
```

Do not commit API keys or other secrets to GitHub.

Install backend dependencies using the project's package configuration.

```bash
npm install
```

Start the backend using the command configured in the backend's `package.json`.

The local frontend assistant configuration uses:

```text
http://localhost:3000/api
```

The backend provides these API endpoints:

```text
POST /api/chat
GET  /api/health
```

**Note:** The Python command starts only the frontend static server. The Express backend must also be running separately for local AI assistant functionality.

---

# 15. Deployment

ARES is deployed using Vercel.

### Frontend

The browser-based frontend is deployed at:

https://ares-marswalk-navigation.vercel.app/

### Backend

The Express.js backend is configured for Vercel serverless deployment.

The application uses environment-aware API routing:

- Local development communicates with the local Express API.
- The deployed frontend communicates with the deployed API through the configured production endpoint.

### Deployment Requirements

- Configure the required environment variables in Vercel.
- Add the Groq API key as a server-side environment variable.
- Verify the frontend API endpoint.
- Verify the backend health endpoint.
- Test AI chat functionality after deployment.

Never expose the Groq API key in frontend JavaScript or publicly accessible source files.

---

# 16. Testing and Validation

The application was tested using different mission configurations.

### Route Planning Tests

- FAST one-way route.
- SAFE one-way route.
- FAST round-trip route.
- SAFE round-trip route.

### Mission Statistics Tests

- Route distance.
- Estimated EVA duration.
- Maximum route slope.
- Elevation gain.
- Outbound and return statistics.
- Combined mission statistics.
- EVA time-limit evaluation.

### Terrain Assessment Tests

- Low-slope classification.
- Moderate-slope classification.
- High-slope classification.
- Assessed sample counts.
- Skipped sample counts.
- Combined round-trip hazard statistics.

### AI Assistant Tests

- Mission type identification.
- FAST and SAFE mode identification.
- Route metric interpretation.
- Outbound and return comparisons.
- Combined round-trip statistics.
- EVA time-limit questions.
- Missing and unavailable mission information.

Testing also highlighted the importance of synchronizing the latest route and terrain assessment values with the mission context sent to the AI backend.

---

# 17. Known Limitations

ARES is a prototype and has limitations that should be considered when interpreting its results.

1. **Terrain Resolution:** The current global elevation service is coarser than local high-resolution Jezero terrain datasets.
2. **Simplified Hazard Classification:** Slope thresholds do not represent a complete physical hazard model.
3. **Heuristic SAFE Routing:** SAFE mode does not guarantee the safest possible route.
4. **EVA Estimation:** Travel duration is estimated using configured speed assumptions and does not model every factor affecting astronaut movement.
5. **AI Reliability:** AI-generated explanations depend on the supplied mission context and may require verification.
6. **Data Availability:** Terrain analysis depends on the coverage and availability of the external elevation service.
7. **Scientific Validation:** ARES is not an officially validated NASA navigation or astronaut mission-planning system.

---

# 18. Future Improvements

Potential future development areas include:

- Integration of higher-resolution Jezero Crater CTX and HiRISE DEM datasets.
- Improved local terrain analysis.
- More advanced terrain-aware route optimization.
- Additional surface hazard information.
- More detailed astronaut mobility and EVA constraints.
- Expanded scientific context for destinations.
- Enhanced AI explanations using verified scientific datasets.
- Voice-based interaction such as a future "Hey ARES" assistant.
- More extensive route validation and mission simulation.

These are potential future enhancements and should not be interpreted as currently implemented functionality.

---

# 19. Contributors

ARES was developed as a collaborative project.

**Project Team:** ARES Development Team

**Project Focus:**
- Mars surface navigation.
- Geographic information systems.
- Terrain-aware route planning.
- Mission analysis.
- Generative AI integration.

Individual contributor roles and responsibilities can be added here.

---

# Final Note

ARES demonstrates how interactive planetary mapping, terrain-derived analysis, route planning, and Generative AI can be combined into a single Mars surface navigation and mission-planning prototype.

The project aims to make complex planetary information more accessible and understandable while exploring how future astronaut surface-navigation systems could support more informed mission decisions.

**ARES – Find a way. Bring them home.**
