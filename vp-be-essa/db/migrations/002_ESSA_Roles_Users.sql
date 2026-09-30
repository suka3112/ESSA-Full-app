-- Phase 1: ESSA internal AP roles (IDs 5–8)
-- Run before db/seed-essa-ap-users.ts to provision @essa.com users.

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 5)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (5, N'AP Team', N'AP Team', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 6)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (6, N'AP Supervisor', N'AP Supervisor', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 7)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (7, N'AP Lead', N'AP Lead', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 8)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (8, N'Finance Manager', N'Finance Manager', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;
