# Fire Apparatus Manager

Static front-end prototype for tracking apparatus/device assignment to fire units, station placement, unit status, and the swap-out audit trail.

## Current state (this repo)

Everything below runs entirely in the browser - there is no server or database yet. State is kept in `localStorage`, so it persists per-browser only.

- **Board** ([index.html](index.html)): stations, Ready Spares, and In Shop, each holding vehicle tiles.
- **Drag & drop** ([assets/js/main.js](assets/js/main.js)): drag a tile onto another to swap them, or into an empty slot to move it. Layout persists across reloads.
- **Tile states**:
  - *Moved Up* - applied automatically when a tile is dragged from its home station to a different station. Double-click a moved-up tile to send it back home.
  - *In Shop* - applied automatically to any tile placed in the In Shop column (grayed out, unavailable).
  - *On Call* - toggle manually by right-clicking a tile.
- **Swap Out Log**: every drag/drop swap or move writes a row automatically (user, timestamp, unit, device in service, device OOS). The **ADD SWAP** button inserts a manual row; each row's pencil icon toggles edit mode and the X deletes it. The log persists across reloads.

Not implemented yet (out of scope for the static prototype): ad hoc unit creation/removal, "Browned Out" / "Added Unit" states, admin screens for stations/units/statuses/attributes, and anything requiring multi-user shared state.

## Setting up the real backend

The product spec (`Fire Apparatus Manager - v0 - 03.20.2026.docx.pdf`) defines a full SQL Server schema and service layer. None of it exists yet - this is the path to build it.

### 1. Choose and provision the stack

- **Database**: SQL Server (per spec). Provision an instance/database and get a connection string.
- **API server**: pick a framework (e.g. Node/Express or .NET) to host the services below and serve `index.html`/assets.
- **Hosting**: decide where the API + DB will run (Azure, on-prem, etc.) before writing infra code.

### 2. Create the schema

Two logical groups of tables:

**Attribute model** - device capability classification:
- `tblFireAttributes` - parent attribute definitions (Apparatus Type, Pump, Water, Ladders, Staffing, Paramedic, Extrication…).
- `tblFireAttributeValues` - allowed values per attribute (FK `ParentFireAttributeID`).
- `tblFireDeviceAttributeAssignments` - assigns a value to a physical device (FK `DeviceID`, `FireAttributeValueID`).

**Operations / swap model** - live + historical state:
- `tblDevices` - physical devices (`DeviceID` PK, `DeviceTypeID`, `BusinessID`, `DeviceName`, `DeviceDescription`).
- `tblFireStations` - stations *and* special containers (Ready Spares, In Shop) modeled as station rows, not hard-coded UI regions (`FireStationID` PK, `BusinessID`, `StationCode`, `StationName`, `DisplayOrder`, `StationType`).
- `tblFireUnits` - the operational unit identity (E1, T4, BC1…), separate from the physical device (`FireUnitID` PK, `DeviceID` FK, `UnitCode`, `UnitDisplayName`, `FillColor`, `IsReserveUnit`, `IsActive`).
- `tblFireUnitStatuses` - status catalog (Available, Moved Up, Browned Out, Added Unit, On a Call) driving status pills, tile colors, and reporting (`FireUnitStatusID` PK, `StatusCode`, `StatusName`, `IsActive`).
- `tblFireSwapLog` - full audit/history row per swap or status event: both devices involved, old/new unit + station for each, `FireUnitStatusID`, `SwapSource` (`Manual`, `DragDrop`, `CAD`, `RuleEngine`, `AdminEdit`), `SwapReason`, `IsManualEntry`, `Comments`, `SwapTimestamp`.

Relationships: one attribute → many values; one value → many device assignments; one station → many units and many swap-log rows; one device → many swap-log rows; one status → many swap-log rows.

### 3. Build the service layer

Suggested services, one per concern:
- `AssignmentService` - assign/reassign a device to a unit (validate unit active, validate device not already assigned, update assignment, write swap-log row with reason `'Device assigned to unit'`).
- `StationMoveService` - move a unit between stations (update `AssignedStationID`, log `FromStationID`/`ToStationID`, set status `MOVED_UP` where appropriate).
- `UnitStatusService` - quick status changes (returned to home station, marked on a call, added unit) as lightweight commands that still write full audit rows.
- `SwapOutLogService` - read/write `tblFireSwapLog`, including moving a device out of service (`DeviceIDOOS`, source e.g. `DropPool`, status `BROWNED_OUT` if left unstaffed).
- `CapabilityService` - manage attribute/value/assignment tables.
- `ReferenceDataService` - lookups for stations, units, statuses, attributes.

### 4. Wire the front-end to the API

Once the API exists, replace this repo's `localStorage` calls (`saveLayout`/`restoreLayout`, `saveOnCallState`/`restoreOnCallState`, `persistSwapLog`/`initSwapLog` in [assets/js/main.js](assets/js/main.js)) with calls to `AssignmentService`/`StationMoveService`/`SwapOutLogService` etc., and tag drag/drop-originated log rows with `SwapSource = 'DragDrop'` to match the schema's audit intent.

### 5. Admin screens

Build CRUD screens for stations, units, statuses, and attribute/value definitions (`ReferenceDataService`/`CapabilityService`) - currently everything on the board is hard-coded in `index.html`.
