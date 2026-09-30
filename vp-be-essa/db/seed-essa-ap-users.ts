/**
 * ESSA internal AP + Non-PO DoA users — idempotent seed.
 * Usage: npm run seed:essa-users
 *
 * Prerequisites:
 *   db/migrations/002_ESSA_Roles_Users.sql
 *   db/migrations/007_ESSA_HOS_HOD_Roles.sql
 *   db/migrations/008_ESSA_HOF_STH_GFD_Roles.sql
 */
import { Sequelize } from "sequelize";
import { verifyDBConnection } from "../src/config/sequelize";
import "../src/models/employee";
import "../src/models/user";
import "../src/models/entity";
import { Employee } from "../src/models/employee";
import { User } from "../src/models/user";
import { Entity } from "../src/models/entity";
import { sequelize } from "../src/config/sequelize";
import { generatePassword } from "../src/utils/globalFunction";
import { UserRole } from "../src/utils/enums/role.enum";

type SeedUser = {
  empCode: string;
  email: string;
  name: string;
  roleId: UserRole;
  department: string;
  designation: string;
  managerCode: string | null;
};

const USERS: SeedUser[] = [
  {
    empCode: "E001",
    email: "ap.team@essa.com",
    name: "Putri Maharani",
    roleId: UserRole.AP_TEAM,
    department: "Finance",
    designation: "AP Team",
    managerCode: "E002",
  },
  {
    empCode: "E002",
    email: "ap.supervisor@essa.com",
    name: "Siti Rahmawati",
    roleId: UserRole.AP_SUPERVISOR,
    department: "Finance",
    designation: "AP Supervisor",
    managerCode: "E003",
  },
  {
    empCode: "E003",
    email: "ap.lead@essa.com",
    name: "Dewi Lestari",
    roleId: UserRole.AP_LEAD,
    department: "Finance",
    designation: "AP Lead",
    managerCode: "E004",
  },
  {
    empCode: "E004",
    email: "finance.manager@essa.com",
    name: "Rini Maharani",
    roleId: UserRole.FINANCE_MANAGER,
    department: "Finance",
    designation: "Finance Manager",
    managerCode: null,
  },
  {
    empCode: "E005",
    email: "hos@essa.com",
    name: "Budi Hartono",
    roleId: UserRole.HOS,
    department: "Operations",
    designation: "Head of Section",
    managerCode: "E006",
  },
  {
    empCode: "E006",
    email: "hod@essa.com",
    name: "Made Wirawan",
    roleId: UserRole.HOD,
    department: "Operations",
    designation: "Head of Department",
    managerCode: "E004",
  },
  {
    empCode: "E007",
    email: "hof@essa.com",
    name: "Anastasia Putri",
    roleId: UserRole.HOF,
    department: "Finance",
    designation: "Head of Function",
    managerCode: "E004",
  },
  {
    empCode: "E008",
    email: "sth@essa.com",
    name: "Robinson Selvaraj",
    roleId: UserRole.STH,
    department: "Operations",
    designation: "Operations & Site Head",
    managerCode: "E004",
  },
  {
    empCode: "E009",
    email: "gfd@essa.com",
    name: "Anas Reksoatmodjo",
    roleId: UserRole.GFD,
    department: "Finance",
    designation: "Group Functional Director",
    managerCode: null,
  },
];

const DEFAULT_PASSWORD = process.env.ESSA_SEED_PASSWORD || "Essa@2026";

const ESSA_ROLES = [
  { id: UserRole.AP_TEAM, name: "AP Team" },
  { id: UserRole.AP_SUPERVISOR, name: "AP Supervisor" },
  { id: UserRole.AP_LEAD, name: "AP Lead" },
  { id: UserRole.FINANCE_MANAGER, name: "Finance Manager" },
  { id: UserRole.HOS, name: "HOS" },
  { id: UserRole.HOD, name: "HOD" },
  { id: UserRole.HOF, name: "HOF" },
  { id: UserRole.STH, name: "STH" },
  { id: UserRole.GFD, name: "GFD" },
];

async function ensureRoles() {
  for (const role of ESSA_ROLES) {
    const [rows] = await sequelize.query(
      "SELECT ID FROM USER_ROLE WHERE ID = :id",
      { replacements: { id: role.id } },
    );
    if (Array.isArray(rows) && rows.length > 0) continue;

    await sequelize.query(
      `SET IDENTITY_INSERT USER_ROLE ON;
       INSERT INTO USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
       VALUES (:id, :name, :name, 0, GETDATE(), 1, GETDATE());
       SET IDENTITY_INSERT USER_ROLE OFF;`,
      { replacements: { id: role.id, name: role.name } },
    );
    console.log(`  created role: ${role.name} (${role.id})`);
  }
}

async function resolveEntityCode(): Promise<string> {
  const entity = await Entity.findOne({
    where: { Is_Deleted: false },
    order: [["ID", "ASC"]],
    attributes: ["CoCd"],
  });
  if (!entity?.CoCd) {
    throw new Error("No entity found — create an entity before seeding ESSA users.");
  }
  return String(entity.CoCd);
}

async function seedUser(row: SeedUser, coCd: string, hashPassword: string) {
  const existing = await User.findOne({ where: { Email: row.email } });
  if (existing) {
    console.log(`  skip (exists): ${row.email}`);
    return existing.Employee_Id;
  }

  const emp = await Employee.create({
    Employee_Code: row.empCode,
    Department: row.department,
    Designation: row.designation,
    Email: row.email,
    CoCd: coCd,
    Phone_Number: "+620000000001",
  });

  await User.create({
    Name: row.name,
    CoCd: coCd,
    Employee_Id: emp.ID,
    Employee_Code: row.empCode,
    Email: row.email,
    Password: hashPassword,
    Phone_Number: "+620000000001",
    Role_id: row.roleId,
    Primary_User: true,
    Is_CR_Approved: true,
    CR_Approved_date: Sequelize.literal("GETDATE()"),
    Is_Manager_Approved: true,
    Manager_Approved_Dt: Sequelize.literal("GETDATE()"),
    Is_Active: true,
    Is_User: true,
    Is_Supplier: false,
    New_Login: false,
  });

  console.log(`  created: ${row.email} (${row.empCode}, role ${row.roleId})`);
  return emp.ID;
}

async function linkManagers() {
  for (const row of USERS) {
    if (!row.managerCode) continue;

    const emp = await Employee.findOne({ where: { Employee_Code: row.empCode } });
    const manager = await Employee.findOne({
      where: { Employee_Code: row.managerCode },
    });
    if (!emp || !manager) continue;

    await Employee.update(
      {
        Reporting_Manager: manager.ID,
        Reporting_Manager_Code: row.managerCode,
      },
      { where: { ID: emp.ID } },
    );
  }
}

async function main() {
  console.log("Seeding ESSA internal AP + DoA users…");
  await verifyDBConnection();
  console.log("Ensuring ESSA roles exist…");
  await ensureRoles();
  const coCd = await resolveEntityCode();
  console.log(`Using entity CoCd: ${coCd}`);

  const { hashPassword } = await generatePassword(DEFAULT_PASSWORD);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);

  for (const row of USERS) {
    await seedUser(row, coCd, hashPassword);
  }

  await linkManagers();
  console.log("Reporting hierarchy linked.");
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
