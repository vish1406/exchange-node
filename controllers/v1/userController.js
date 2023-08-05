import ErrorResponse from "../../lib/error-handling/error-response.js";
import { decryptTransactionCode } from "../../lib/helpers/transaction-code.js";
import AppModule from "../../models/v1/AppModule.js";
import User from "../../models/v1/User.js";
import { USER_ACTIVITY_EVENT } from "../../models/v1/UserActivity.js";
import userRequest from "../../requests/v1/userRequest.js";
import permissionService from "../../services/v1/permissionService.js";
import userActivityService from "../../services/v1/userActivityService.js";
import userService from "../../services/v1/userService.js";

// Get all users
const getAllUser = async (req, res) => {
  const { user, body } = await userRequest.userListingRequest(req);

  const users = await userService.fetchAllUsers({ user, ...body });

  return res.status(200).json({ success: true, data: users });
};

// Get user by ID
const getUserById = async (req, res) => {
  const { _id = null, fields } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const user = await userService.fetchUserId(_id, fields);

  res.status(200).json({ success: true, data: { details: user } });
};

// Create a new user
const createUser = async (req, res) => {
  const { user, body } = await userRequest.createUserRequest(req);

  const newUser = await userService.addUser({ user, ...body });

  await userActivityService.createUserActivity({
    userId: newUser._id,
    event: USER_ACTIVITY_EVENT.CREATED,
    ipAddress: body.ipAddress,
    description: body.description,
  });

  res.status(201).json({ success: true, data: { details: newUser } });
};

// Update a user
const updateUser = async (req, res) => {
  const { user, body } = await userRequest.updateUserRequest(req);

  const updatedUser = await userService.modifyUser({ user, ...body });

  await userActivityService.createUserActivity({
    userId: updatedUser._id,
    event: USER_ACTIVITY_EVENT.UPDATED,
    ipAddress: body.ipAddress,
    description: body.description,
  });

  res.status(200).json({ success: true, data: { details: updatedUser } });
};

// Delete a user
const deleteUser = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedUser = await userService.removeUser(_id);

  res.status(200).json({ success: true, data: { details: deletedUser } });
};

// Bet Lock
const updateUserStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const isActive = req.body?.isActive || null;
  const isBetLock = req.body?.isBetLock || null;
  if (!_id) {
    throw new Error("_id is required!");
  }

  const updatedUserStatus = await userService.statusModify({
    _id,
    isActive,
    isBetLock,
  });

  res.status(200).json({ success: true, data: { details: updatedUserStatus } });
};

// Fetch User Balance
const fetchUserBalance = async (req, res) => {
  const { user, body } = await userRequest.fetchUserBalanceRequest(req);

  const fetchBalance = await userService.fetchBalance({ user, ...body });

  res.status(200).json({ success: true, data: fetchBalance });
};

const createUserClone = async (req, res) => {
  const { user, body } = await userRequest.cloneUserRequest(req);

  const clonedUser = await userService.cloneUser({ user, ...body });

  res.status(200).json({ success: true, data: { details: clonedUser } });
};

const getUserTransactionCode = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new ErrorResponse("_id is required!").status(200);
  }

  const user = await User.findById(_id, { transactionCode: 1 });
  const transactionCode = decryptTransactionCode(user.transactionCode);

  res.status(200).json({ success: true, data: { details: transactionCode } });
};

const getUserPermissions = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new ErrorResponse("_id is required!").status(200);
  }

  const userPermissions = await permissionService.fetchUserPermissions({
    userId: _id,
  });

  res.status(200).json({ success: true, data: { details: userPermissions } });
};

const getAppModulesList = async (req, res) => {
  const appModules = await AppModule.find({}, { name: 1, key: 1 });

  res.status(200).json({ success: true, data: { details: appModules } });
};

const getHydratedUser = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new ErrorResponse("_id is required!").status(401);
  }

  const user = await userService.fetchHydratedUser(_id);

  res.status(200).json({ success: true, data: { details: user } });
};

export default {
  getAllUser,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  fetchUserBalance,
  createUserClone,
  getUserTransactionCode,
  getUserPermissions,
  getAppModulesList,
  getHydratedUser,
};
