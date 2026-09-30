import { Router } from 'express';
import essaUserController from '../../controllers/essaUser.controller';
import { Authenticate } from '../../middleware/authentication';
import { UserRole } from '../../utils/enums/role.enum';

const essaUserRoutes = Router();

essaUserRoutes.get(
  '/',
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE, UserRole.BUSINESS]),
  (req, res) => essaUserController.getUsersAndRoles(req, res)
);

essaUserRoutes.post(
  '/',
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res) => essaUserController.createUser(req, res)
);

essaUserRoutes.post(
  '/:id',
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res) => essaUserController.updateUser(req, res)
);

essaUserRoutes.post(
  '/roles/manage',
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res) => essaUserController.manageRole(req, res)
);

export default essaUserRoutes;
