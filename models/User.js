import mongoose from "mongoose";
import { encryptPassword } from "../lib/auth-helpers.js";
import softDeletePlugin from "./plugins/soft-delete.js";
import timestampPlugin from "./plugins/timestamp.js";

export const USER_ROLE = {
  SYSTEM_OWNER: "system_owner",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SUPER_MASTER: "super_master",
  MASTER: "master",
  AGENT: "agent",
  USER: "user",
};

export const USER_ACCESSIBLE_ROLES = {
  [USER_ROLE.SYSTEM_OWNER]: Object.values(USER_ROLE),

  [USER_ROLE.SUPER_ADMIN]: [USER_ROLE.ADMIN, USER_ROLE.SUPER_MASTER, USER_ROLE.MASTER, USER_ROLE.AGENT, USER_ROLE.USER],

  [USER_ROLE.ADMIN]: [USER_ROLE.SUPER_MASTER, USER_ROLE.MASTER, USER_ROLE.AGENT, USER_ROLE.USER],

  [USER_ROLE.SUPER_MASTER]: [USER_ROLE.MASTER, USER_ROLE.AGENT, USER_ROLE.USER],

  [USER_ROLE.MASTER]: [USER_ROLE.AGENT, USER_ROLE.USER],

  [USER_ROLE.AGENT]: [USER_ROLE.USER],

  [USER_ROLE.USER]: [],
};

const userSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "user",
    },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "currency",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isBetLock: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: async function (value) {
          if (this._id) {
            var count = await this.constructor.countDocuments({ _id: { $ne: this._id }, username: value });
          } else {
            var count = await this.model("user").countDocuments({ username: value });
          }
          return count === 0;
        },
        message: "Username already exists. Please choose a different username.",
      },
    },
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
    },
    city: {
      type: String,
    },

    password: { type: String, required: true },
    rate: { type: Number, min: 0, max: 1, default: 1 },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      default: USER_ROLE.USER,
    },
    balance: { type: Number, default: 0 },
    exposureLimit: { type: Number, default: 0 },
    clientPl: { type: Number },
    forcePasswordChange: { type: Boolean, default: false },
    transactionCode: { type: String },
    isDeleted: { type: Boolean, default: false }, // soft delete
  },
  { timestamps: true }
);
userSchema.plugin(timestampPlugin);
userSchema.plugin(softDeletePlugin);

// Validate username to only have alphanumeric values and underscore
userSchema.path("username").validate(function (value) {
  return /^[a-zA-Z0-9_]+$/.test(value);
}, "Username can only contain alphanumeric characters or an underscore.");

// Pre hook for encrypting the password
userSchema.pre("save", async function (next) {
  const user = this;

  // If the password field has not been modified, move to the next middleware
  if (!user.isModified("password")) {
    return next();
  }

  try {
    const hashedPassword = await encryptPassword(user.password);
    user.password = hashedPassword;

    //generate transaction code
    if (!user.transactionCode) {
      user.transactionCode = generateTransactionCode();
    }

    next();
  } catch (error) {
    next(error);
  }
});

function generateTransactionCode() {
  const chars = "0123456789";
  let result = "";
  for (let i = 6; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const User = mongoose.model("user", userSchema);

export default User;
