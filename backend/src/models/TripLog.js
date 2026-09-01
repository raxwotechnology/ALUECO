import mongoose from 'mongoose';

const tripLogSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: false,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    startOdometer: { type: Number, required: false },
    endOdometer:   { type: Number },
    startDate:     { type: Date, default: Date.now },
    endDate:       { type: Date },
    origin:        { type: String, required: false },
    destination:   { type: String, required: false },

    // FIXED: was declared twice (bug fix)
    purpose: { type: String, default: 'delivery' },

    fuelConsumed: { type: Number },  // litres
    fuelCost:     { type: Number },

    // FIXED: was declared twice (bug fix)
    status: { type: String, default: 'active' },

    notes: { type: String },

    // ── ALE-specific additions ───────────────────────────────────────────
    grnId:      { type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' },
    // Links trip to the GRN it collected (e.g. Bolero collecting from Chaminda)

    fuelRate:   { type: Number }, // Rs per litre at time of fill-up
    totalCost:  { type: Number }, // auto-computed: fuelConsumed × fuelRate
    distanceKm: { type: Number }, // auto-computed: endOdometer - startOdometer

    itemsTransported: [{
        item: String,
        quantity: Number,
        uom: String,
    }],
    quantityWeightTransported: { type: Number, default: 0 },
    shift: { type: String, enum: ['day', 'night'], default: 'day' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Pre-save Hook: Auto-calculate distance and fuel cost ────────────────────
tripLogSchema.pre('save', function() {
  if (this.startOdometer && this.endOdometer) {
    this.distanceKm = this.endOdometer - this.startOdometer;
  }
  if (this.fuelConsumed && this.fuelRate) {
    this.totalCost = parseFloat((this.fuelConsumed * this.fuelRate).toFixed(2));
  }
});

tripLogSchema.index({ vehicleId: 1, startDate: -1 });
tripLogSchema.index({ driverId: 1 });
tripLogSchema.index({ grnId: 1 });

const TripLog = mongoose.model('TripLog', tripLogSchema);
export default TripLog;
