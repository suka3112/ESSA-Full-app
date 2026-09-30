-- ESSA Non-PO DoA approver roles (IDs 9–10)
-- Run before db/seed-essa-ap-users.ts (re-run seed to create users).

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 9)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (9, N'HOS', N'HOS', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USER_ROLE WHERE ID = 10)
BEGIN
  SET IDENTITY_INSERT dbo.USER_ROLE ON;
  INSERT INTO dbo.USER_ROLE (ID, Role_Name_EN, Role_Name_AR, Is_Deleted, CreatedDt, CreatedBy, ModifiedDt)
  VALUES (10, N'HOD', N'HOD', 0, GETDATE(), 1, GETDATE());
  SET IDENTITY_INSERT dbo.USER_ROLE OFF;
END;
