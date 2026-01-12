// import express from "express";
// import { auth } from "../middleware/authMiddleware.js";
// import { createUser } from "../controllers/userDetails/createUserController.js";
// import {getDepartments, getDepartmentById} from "../controllers/userDetails/departmentController.js";
// import {getDesignations, getDesignationsById} from "../controllers/userDetails/desginationController.js";
// import {getLevel, getLevelById} from "../controllers/userDetails/levelController.js";
// import {getRoles} from "../controllers/userDetails/roleController.js"

// const router = express.Router();

// // departments routes
// router.get("/departments", auth, getDepartments);
// router.get("/departments/:id", auth, getDepartmentById);

// // departments routes
// router.get("/designations", auth, getDesignations);
// router.get("/designations/:id", auth, getDesignationsById);

// // Level routes
// router.get("/level", auth, getLevel);
// router.get("/level/:id", auth, getLevelById);

// // Role routes
// router.get("/roles", auth, getRoles);

// // create user
// router.post("/createUser", auth, createUser);




// export default router;


import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import { createUser, getUsersList } from "../controllers/userDetails/createUserController.js";
import {getDepartments, getDepartmentById} from "../controllers/userDetails/departmentController.js";
import { getDesignations, getDesignationsById, getDesignationsByDeptLevel } from "../controllers/userDetails/desginationController.js"
import {getLevel, getLevelsByDeptId} from "../controllers/userDetails/levelController.js";
import {getRoles, getRolesbyDesig} from "../controllers/userDetails/roleController.js"

const router = express.Router();

// departments routes
router.get("/departments", auth, getDepartments);
router.get("/departments/:id", auth, getDepartmentById);

// designations routes
router.get("/designations", auth, getDesignations);
router.get("/designations/:id", auth, getDesignationsById);
router.get("/designationsByDeptLevel", auth, getDesignationsByDeptLevel);

// Level routes
router.get("/level", auth, getLevel);
router.get("/level/:departmentId", auth, getLevelsByDeptId);

// Role routes
router.get("/roles", auth, getRoles);
router.get("/roles/by-designation/:designationId", auth, getRolesbyDesig);

// create user
router.post("/createUser", auth, createUser);
router.get("/usersList", auth, getUsersList)

export default router;