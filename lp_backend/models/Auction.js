import mongoose from "mongoose";

export function calculateAuctionStatus(startTime, endTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (now < start) {
    return "UPCOMING";
  } else if (now >= start && now <= end) {
    return "ACTIVE";
  } else {
    return "ENDED";
  }
}

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Auction title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Auction description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    startingPrice: {
      type: Number,
      required: [true, "Starting price is required"],
      min: [0.01, "Starting price must be greater than 0"],
    },
    images: {
      type: [String],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one image URL is required",
      },
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      validate: {
        validator: function (value) {
          return this.startTime ? new Date(value) > new Date(this.startTime) : true;
        },
        message: "End time must be after start time",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["UPCOMING", "ACTIVE", "ENDED"],
        message: "{VALUE} is not a valid auction status",
      },
      default: "UPCOMING",
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller reference is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

auctionSchema.index({ seller: 1 });
auctionSchema.index({ status: 1 });
auctionSchema.index({ category: 1 });
auctionSchema.index({ startTime: 1, endTime: 1 });

auctionSchema.pre("save", function () {
  this.status = calculateAuctionStatus(this.startTime, this.endTime);
});

auctionSchema.methods.syncStatus = function () {
  const currentCalculated = calculateAuctionStatus(this.startTime, this.endTime);
  if (this.status !== currentCalculated) {
    this.status = currentCalculated;
  }
  return this.status;
};

export default mongoose.model("Auction", auctionSchema);

