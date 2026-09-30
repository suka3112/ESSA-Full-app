/* ============================================================
   PO_DETAIL — sorting + ModifiedDt / ModifiedBy update
   ------------------------------------------------------------
   1) Sort query: newest first by ModifiedDt, falling back to
      CreatedDt when ModifiedDt is NULL.
   2) Update query: stamp ModifiedDt / ModifiedBy on selected
      line items so they bubble to the top of the sorted list.
   ============================================================ */

/* ------------------------------------------------------------
   1) SORT QUERY
   Latest "touched" rows on top:
   - rows that were modified sort by their ModifiedDt
   - rows never modified (ModifiedDt IS NULL) sort by CreatedDt
   ------------------------------------------------------------ */
SELECT
    PONo,
    POLnNo,
    Material_Code,
    Material_Description,
    Qty,
    Unit_of_measure,
    NetAmount,
    CreatedDt,
    CreatedBy,
    ModifiedDt,
    ModifiedBy
FROM PO_DETAIL
WHERE Is_Deleted = 0
ORDER BY COALESCE(ModifiedDt, CreatedDt) DESC;
GO


/* ------------------------------------------------------------
   2) UPDATE ModifiedDt / ModifiedBy on selected line items
   Adjust @PONo, the POLnNo list, and @ModifiedBy as needed.
   ------------------------------------------------------------ */
DECLARE @PONo       VARCHAR(10) = '4203000546';
DECLARE @ModifiedBy INT         = 1;            -- user id performing the change

UPDATE PO_DETAIL
SET ModifiedDt = GETDATE(),
    ModifiedBy = @ModifiedBy
WHERE PONo = @PONo
  AND POLnNo IN ('50', '110');                  -- line items to mark as modified
GO


/* ------------------------------------------------------------
   3) Verify the result (modified rows should appear on top)
   ------------------------------------------------------------ */
SELECT
    PONo,
    POLnNo,
    Material_Description,
    CreatedDt,
    ModifiedDt,
    ModifiedBy,
    COALESCE(ModifiedDt, CreatedDt) AS SortKey
FROM PO_DETAIL
WHERE PONo = '4203000546'
  AND Is_Deleted = 0
ORDER BY COALESCE(ModifiedDt, CreatedDt) DESC;
GO
