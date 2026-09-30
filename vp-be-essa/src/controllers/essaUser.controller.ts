import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize';
import logger from '../utils/logger';

// Standard ESSA Permission definitions
const PERMISSION_MODULES = [
  { module: 'Dashboard', cells: { Read: { codes: ['DASHBOARD_VIEW'], allows: 'Open the dashboard' } } },
  {
    module: 'Invoices',
    cells: {
      Read: { codes: ['INVOICE_VIEW'], allows: 'View invoices and their documents' },
      Create: { codes: ['INVOICE_UPLOAD'], allows: 'Upload an invoice manually' },
      Edit: { codes: ['INVOICE_EDIT', 'FIELD_CORRECT', 'INVOICE_REVALIDATE'], allows: 'Correct extracted fields and revalidate an invoice' },
    },
  },
  { module: 'Validation', cells: { Edit: { codes: ['VALIDATION_OVERRIDE'], allows: 'Override a failed validation check with a justification' } } },
  {
    module: 'Exceptions',
    cells: {
      Read: { codes: ['EXCEPTION_VIEW'], allows: 'Open the Exception Workbench' },
      Edit: { codes: ['EXCEPTION_MANAGE'], allows: 'Resolve, override and retry exceptions' },
    },
  },
  {
    module: 'Approvals',
    cells: {
      Read: { codes: ['APPROVAL_VIEW'], allows: 'See the approval queue' },
      Edit: { codes: ['APPROVAL_ACT'], allows: 'Approve or reject an invoice' },
    },
  },
  { module: 'Tax Review', cells: { Edit: { codes: ['TAX_REVIEW'], allows: 'Complete the tax review step' } } },
  {
    module: 'Vendors',
    cells: {
      Read: { codes: ['VENDOR_VIEW'], allows: 'View the vendor list' },
      Edit: { codes: ['VENDOR_CONTROL'], allows: 'Block or unblock a vendor on this platform' },
    },
  },
  {
    module: 'SAP',
    cells: {
      Read: { codes: ['SAP_VIEW'], allows: 'View purchase orders and SAP status' },
      Edit: { codes: ['SAP_RETRY'], allows: 'Send an invoice to SAP again' },
    },
  },
  { module: 'Attendance', cells: { Read: { codes: ['BIOMETRIC_VIEW'], allows: 'View attendance data used for validation' } } },
  {
    module: 'Configuration',
    cells: {
      Read: { codes: ['CONFIG_VIEW'], allows: 'View invoice categories, document types and rules' },
      Create: { codes: ['CONFIG_PUBLISH'], allows: 'Publish a new configuration version' },
      Edit: { codes: ['CONFIG_EDIT'], allows: 'Change categories, document types and rules' },
    },
  },
  {
    module: 'Users & Roles',
    cells: {
      Read: { codes: ['USER_ADMIN'], allows: 'View users, roles and permissions' },
      Create: { codes: ['USER_ADMIN'], allows: 'Create a role' },
      Edit: { codes: ['USER_ADMIN'], allows: 'Assign roles and change permissions' },
      Delete: { codes: ['USER_ADMIN'], allows: 'Delete a role' },
    },
  },
  { module: 'Audit Log', cells: { Read: { codes: ['AUDIT_VIEW'], allows: 'Search the audit log' } } },
  { module: 'Reports', cells: { Read: { codes: ['REPORT_VIEW'], allows: 'Open reports' } } },
];

const ALL_PERMISSION_CODES = Array.from(
  new Set(
    PERMISSION_MODULES.flatMap((m) =>
      Object.values(m.cells).flatMap((c) => (c ? c.codes : []))
    )
  )
);

function getDefaultPermissionsForRole(roleName: string = ''): string[] {
  const norm = roleName.toLowerCase();
  if (norm.includes('admin')) {
    return ALL_PERMISSION_CODES;
  }
  if (norm.includes('finance') || norm.includes('ap') || norm.includes('hof') || norm.includes('gfd')) {
    return [
      'DASHBOARD_VIEW',
      'INVOICE_VIEW',
      'INVOICE_UPLOAD',
      'INVOICE_EDIT',
      'FIELD_CORRECT',
      'INVOICE_REVALIDATE',
      'VALIDATION_OVERRIDE',
      'EXCEPTION_VIEW',
      'EXCEPTION_MANAGE',
      'APPROVAL_VIEW',
      'APPROVAL_ACT',
      'TAX_REVIEW',
      'VENDOR_VIEW',
      'SAP_VIEW',
      'BIOMETRIC_VIEW',
      'REPORT_VIEW',
      'AUDIT_VIEW'
    ];
  }
  if (norm.includes('business') || norm.includes('procurement') || norm.includes('indent') || norm.includes('slp')) {
    return [
      'DASHBOARD_VIEW',
      'INVOICE_VIEW',
      'INVOICE_UPLOAD',
      'APPROVAL_VIEW',
      'APPROVAL_ACT',
      'VENDOR_VIEW',
      'SAP_VIEW',
      'REPORT_VIEW'
    ];
  }
  return ['DASHBOARD_VIEW', 'INVOICE_VIEW', 'VENDOR_VIEW'];
}

export class EssaUserController {
  async getUsersAndRoles(req: Request, res: Response): Promise<void> {
    try {
      // 1. Query users from USERS joined with EMPLOYEE and USER_ROLE
      const usersRaw: any[] = await sequelize.query(
        `
        SELECT 
          u."ID" AS "id",
          u."Name" AS "name",
          u."Email" AS "email",
          u."Role_id" AS "roleId",
          u."Is_Active" AS "isActive",
          u."CreatedDt" AS "createdDt",
          e."Designation" AS "designation",
          e."Department" AS "department",
          r."Role_Name_EN" AS "roleName"
        FROM "USERS" u
        LEFT JOIN "EMPLOYEE" e ON u."Employee_Id" = e."ID" OR u."Email" = e."Email"
        LEFT JOIN "USER_ROLE" r ON u."Role_id" = r."ID"
        ORDER BY u."CreatedDt" DESC;
        `,
        { type: QueryTypes.SELECT }
      );

      // 2. Query active roles from USER_ROLE
      const rolesRaw: any[] = await sequelize.query(
        `
        SELECT 
          "ID" AS "id",
          "Role_Name_EN" AS "name",
          "Is_Deleted" AS "isDeleted"
        FROM "USER_ROLE"
        WHERE "Is_Deleted" IS NOT TRUE
        ORDER BY "ID" ASC;
        `,
        { type: QueryTypes.SELECT }
      );

      const roles = rolesRaw.map((r) => ({
        id: String(r.id),
        code: (r.name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        name: r.name || 'Unnamed Role',
        description: `Permissions for ${r.name || 'Role'}`,
        permissions: getDefaultPermissionsForRole(r.name),
        system: [2, 3, 4].includes(Number(r.id)),
        active: !r.isDeleted,
      }));

      const users = usersRaw.map((u) => {
        const rId = u.roleId ? String(u.roleId) : null;
        const matchedRole = roles.find((r) => r.id === rId);
        const roleNames = matchedRole ? [matchedRole.name] : (u.roleName ? [u.roleName] : []);
        const roleIds = rId ? [rId] : [];

        return {
          id: String(u.id),
          name: u.name || 'Unnamed User',
          email: u.email || '',
          title: u.designation || u.department || (matchedRole ? matchedRole.name : 'Portal User'),
          roleIds,
          roleNames,
          groups: [] as string[],
          enabled: u.isActive !== false,
          lastLoginAt: u.createdDt || null,
          entraObjectId: `entra-${(u.email || 'user').replace(/[^a-z0-9]+/g, '-')}`,
        };
      });

      const permissions = ALL_PERMISSION_CODES.map((code) => ({
        code,
        description: code.replace(/_/g, ' ').toLowerCase(),
      }));

      res.status(200).json({
        status: 200,
        data: {
          users,
          roles,
          permissions,
          permissionModules: PERMISSION_MODULES,
        },
      });
    } catch (err: any) {
      logger.error('Error fetching users and roles:', err);
      res.status(500).json({ status: 500, message: 'Failed to fetch users and roles', error: err?.message });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, title, roleIds, enabled } = req.body;
      if (!name?.trim()) {
        res.status(400).json({ message: 'A valid name is required' });
        return;
      }
      const normEmail = String(email || '').trim().toLowerCase();
      if (!normEmail || !normEmail.includes('@')) {
        res.status(400).json({ message: 'A valid corporate email is required' });
        return;
      }

      // Check duplicate
      const [existing]: any = await sequelize.query(
        `SELECT "ID" FROM "USERS" WHERE LOWER("Email") = :email LIMIT 1;`,
        { replacements: { email: normEmail }, type: QueryTypes.SELECT }
      );
      if (existing) {
        res.status(409).json({ message: 'A user with this email address already exists.' });
        return;
      }

      const roleId = Array.isArray(roleIds) && roleIds.length > 0 ? parseInt(roleIds[0], 10) : null;
      const isActive = enabled !== false;

      // 1. Create Employee record if title given
      let empId: number | null = null;
      try {
        const [empRes]: any = await sequelize.query(
          `
          INSERT INTO "EMPLOYEE" ("Employee_Code", "Designation", "Email", "CreatedDt")
          VALUES (:code, :title, :email, NOW())
          RETURNING "ID";
          `,
          {
            replacements: {
              code: `EMP${Date.now().toString().slice(-4)}`,
              title: title?.trim() || 'Portal User',
              email: normEmail,
            },
            type: QueryTypes.INSERT,
          }
        );
        if (empRes && empRes[0]) {
          empId = empRes[0].ID;
        }
      } catch (e) {
        // ignore employee insert failure if already exists
      }

      // 2. Create User record
      const [userRes]: any = await sequelize.query(
        `
        INSERT INTO "USERS" ("Name", "Email", "Employee_Id", "Role_id", "Is_Active", "Is_User", "CreatedDt")
        VALUES (:name, :email, :empId, :roleId, :isActive, true, NOW())
        RETURNING "ID", "Name", "Email", "Role_id", "Is_Active", "CreatedDt";
        `,
        {
          replacements: {
            name: name.trim(),
            email: normEmail,
            empId,
            roleId,
            isActive,
          },
          type: QueryTypes.INSERT,
        }
      );

      const inserted = userRes && userRes[0] ? userRes[0] : { ID: Date.now() };

      res.status(201).json({
        user: {
          id: String(inserted.ID),
          name: name.trim(),
          email: normEmail,
          title: title?.trim() || 'Portal User',
          roleIds: roleId ? [String(roleId)] : [],
          enabled: isActive,
        },
      });
    } catch (err: any) {
      logger.error('Error creating user:', err);
      res.status(500).json({ message: 'Failed to create user', error: err?.message });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
      const { enabled, roleIds, title } = req.body;

      const userId = parseInt(idStr, 10);
      if (isNaN(userId)) {
        res.status(400).json({ message: 'Invalid user ID' });
        return;
      }

      const updates: string[] = [];
      const replacements: any = { userId };

      if (typeof enabled === 'boolean') {
        updates.push(`"Is_Active" = :enabled`);
        replacements.enabled = enabled;
      }

      if (Array.isArray(roleIds) && roleIds.length > 0) {
        updates.push(`"Role_id" = :roleId`);
        replacements.roleId = parseInt(roleIds[0], 10);
      } else if (Array.isArray(roleIds) && roleIds.length === 0) {
        updates.push(`"Role_id" = NULL`);
      }

      if (updates.length > 0) {
        await sequelize.query(
          `UPDATE "USERS" SET ${updates.join(', ')} WHERE "ID" = :userId;`,
          { replacements, type: QueryTypes.UPDATE }
        );
      }

      if (title) {
        await sequelize.query(
          `
          UPDATE "EMPLOYEE" 
          SET "Designation" = :title 
          WHERE "ID" = (SELECT "Employee_Id" FROM "USERS" WHERE "ID" = :userId)
             OR "Email" = (SELECT "Email" FROM "USERS" WHERE "ID" = :userId);
          `,
          { replacements: { title: title.trim(), userId }, type: QueryTypes.UPDATE }
        );
      }

      res.status(200).json({ success: true, message: 'User updated successfully' });
    } catch (err: any) {
      logger.error('Error updating user:', err);
      res.status(500).json({ message: 'Failed to update user', error: err?.message });
    }
  }

  async manageRole(req: Request, res: Response): Promise<void> {
    try {
      const { op, row } = req.body;

      if (op === 'CREATE') {
        const roleName = row?.name?.trim();
        if (!roleName) {
          res.status(400).json({ message: 'Role name is required' });
          return;
        }

        const [created]: any = await sequelize.query(
          `
          INSERT INTO "USER_ROLE" ("Role_Name_EN", "Is_Deleted", "CreatedDt")
          VALUES (:roleName, false, NOW())
          RETURNING "ID";
          `,
          { replacements: { roleName }, type: QueryTypes.INSERT }
        );

        res.status(201).json({ success: true, id: created && created[0] ? String(created[0].ID) : '0' });
        return;
      }

      if (op === 'UPDATE') {
        const roleId = parseInt(row?.id, 10);
        const roleName = row?.name?.trim();
        const active = row?.active !== false;

        await sequelize.query(
          `
          UPDATE "USER_ROLE" 
          SET "Role_Name_EN" = COALESCE(:roleName, "Role_Name_EN"),
              "Is_Deleted" = :isDeleted,
              "ModifiedDt" = NOW()
          WHERE "ID" = :roleId;
          `,
          {
            replacements: { roleId, roleName, isDeleted: !active },
            type: QueryTypes.UPDATE,
          }
        );

        res.status(200).json({ success: true });
        return;
      }

      if (op === 'DELETE') {
        const roleId = parseInt(row?.id, 10);

        // Check if users hold this role
        const [holdingUsers]: any = await sequelize.query(
          `SELECT "ID" FROM "USERS" WHERE "Role_id" = :roleId LIMIT 1;`,
          { replacements: { roleId }, type: QueryTypes.SELECT }
        );

        if (holdingUsers) {
          res.status(400).json({
            message: 'This role is still assigned to users. Remove the assignments first or disable the role.',
          });
          return;
        }

        await sequelize.query(
          `UPDATE "USER_ROLE" SET "Is_Deleted" = true, "ModifiedDt" = NOW() WHERE "ID" = :roleId;`,
          { replacements: { roleId }, type: QueryTypes.UPDATE }
        );

        res.status(200).json({ success: true });
        return;
      }

      res.status(400).json({ message: 'Unsupported role operation' });
    } catch (err: any) {
      logger.error('Error managing role:', err);
      res.status(500).json({ message: 'Failed to manage role', error: err?.message });
    }
  }
}

export default new EssaUserController();
