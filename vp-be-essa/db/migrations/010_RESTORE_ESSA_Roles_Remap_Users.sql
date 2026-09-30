-- Restore ESSA portal roles that were lost when IDs 7–13 were occupied by
-- DC/procurement roles. Does NOT update or delete existing USER_ROLE rows.
--
-- New role IDs (must match src/utils/enums/role.enum.ts + vp-fe-essa essaRoles.js):
--   14 AP Lead
--   15 Finance Manager
--   16 HOS
--   17 HOD
--   18 HOF
--   19 STH
--   20 GFD
--
-- Existing 5 (AP Team) / 6 (AP Supervisor) are left as-is.
-- Users below are remapped from old IDs 7–13 onto 14–20.

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 14)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (14, N'AP Lead', N'AP Lead', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 15)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (15, N'Finance Manager', N'Finance Manager', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 16)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (16, N'HOS', N'HOS', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 17)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (17, N'HOD', N'HOD', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 18)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (18, N'HOF', N'HOF', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 19)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (19, N'STH', N'STH', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 20)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (20, N'GFD', N'GFD', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

-- Remap ESSA users (by ID + email) onto the restored roles.
UPDATE dbo.USERS
SET Role_id = 14, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3206 AND Email = N'ap.lead@essa.com';

UPDATE dbo.USERS
SET Role_id = 15, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3207 AND Email = N'finance.manager@essa.com';

UPDATE dbo.USERS
SET Role_id = 16, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3208 AND Email = N'hos@essa.com';

UPDATE dbo.USERS
SET Role_id = 17, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3209 AND Email = N'hod@essa.com';

UPDATE dbo.USERS
SET Role_id = 18, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3210 AND Email = N'hof@essa.com';

UPDATE dbo.USERS
SET Role_id = 19, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3211 AND Email = N'sth@essa.com';

UPDATE dbo.USERS
SET Role_id = 20, ModifiedDt = GETDATE(), ModifiedBy = 1
WHERE ID = 3212 AND Email = N'gfd@essa.com';

-- Optional verification:
-- SELECT ID, Role_Name_EN, Is_Deleted FROM dbo.USER_ROLE WHERE ID BETWEEN 5 AND 20 ORDER BY ID;
-- SELECT ID, Name, Email, Role_id FROM dbo.USERS WHERE ID IN (3204,3205,3206,3207,3208,3209,3210,3211,3212) ORDER BY ID;
