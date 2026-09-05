# Migration Guide: Adding Specifications to AluApplication Records

## Problem
All aluminum quotation items were showing the same generic description in the customer view:
- Profile: Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)
- Glass: 5mm Single Tempered Clear Glass
- Hardware: Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals
- Scope & Labour: Fabrication, Delivery & Installation Inclusive

## Solution
Added specification fields to the AluApplication model so each application type/configuration can have its own specifications.

## Changes Made

### 1. Backend Model Update
**File:** `backend/src/models/AluApplication.js`
- Added fields: `profileSpec`, `glassSpec`, `hardwareSpec`, `scopeSpec`
- Each field has default values for backward compatibility

### 2. Backend Controller Update
**File:** `backend/src/controllers/aluQuotationController.js`
- Updated `captureRatesSnapshot()` to include the new spec fields
- Updated `calculateQuotation()` to use specs from application templates
- Fallback to defaults if template specs are not available

### 3. Frontend Form Update
**File:** `frontend/src/pages/AluQuotationFormPage.jsx`
- Updated `handleItemChange()` to auto-populate specs when application type/configuration changes
- Updated `addOpening()` to use specs from matching templates
- Updated form initialization to use specs from existing quotations

### 4. Frontend Configurator Update
**File:** `frontend/src/pages/AluConfiguratorPage.jsx`
- Updated to use specs from selected templates

### 5. Migration Support
**Files:** 
- `backend/migrations/runMigration.js` - API endpoint for migration
- `backend/migrations/addSpecsToApplications.js` - Standalone migration script
- `backend/src/routes/aluRoutes.js` - Added migration endpoint

## Running the Migration

### Option 1: Via API Endpoint (Recommended)
The backend server must be running. Then:

```bash
curl -X POST http://localhost:5001/api/alu/migrations/add-specs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 2: Standalone Script
```bash
cd backend
node migrations/addSpecsToApplications.js
```

### Option 3: Manual Database Update
If you prefer to update manually via MongoDB shell:

```javascript
db.aluapplications.updateMany(
  {
    $or: [
      { profileSpec: { $exists: false } },
      { glassSpec: { $exists: false } },
      { hardwareSpec: { $exists: false } },
      { scopeSpec: { $exists: false } }
    ]
  },
  {
    $set: {
      profileSpec: 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)',
      glassSpec: '5mm Single Tempered Clear Glass',
      hardwareSpec: 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals',
      scopeSpec: 'Fabrication, Delivery & Installation Inclusive'
    }
  }
)
```

## Updating Application Templates

After migration, you should update your application templates in the database to have proper specifications for each type:

1. Go to the Aluminum Configurator page
2. Edit each application template
3. Update the specification fields:
   - Profile Spec: e.g., "Swisstek 100mm Series" or "Jindal 75mm Series"
   - Glass Spec: e.g., "6mm Double Tempered Tinted Glass" or "8mm Laminated Safety Glass"
   - Hardware Spec: e.g., "Kinlong Premium Locks" or "3H Standard Hardware"
   - Scope Spec: e.g., "Supply Only" or "Fabrication & Installation"

## Testing

1. Create a new quotation with different application types
2. Check the customer view to verify each item shows its specific specifications
3. For existing quotations, the items will show their saved specs (which may be the defaults until you update the templates)

## Rollback

If needed, you can remove the new fields by:

1. Remove the fields from the AluApplication model
2. Remove the spec-related code from controllers and frontend
3. The existing data in those fields will remain in the database but won't be used
