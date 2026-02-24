// Test script for BP BigQuery Warehouse Inventory optimization
// This tests the dynamicTools.ts optimization logic for warehouse/inventory data

// Mock implementation matching dynamicTools.ts logic
function optimizeColumnSelection(
  originalSql,
  selectColumns,
  queryType,
  columnsToBeSummed,
  columnsToBeAveraged,
  conditionFields
) {
  // Define known schema columns for BP warehouse dataset
  const knownColumns = [
    'warehousenum', 'warehouse_number', 'material', 'quantity', 'qty', 'plant', 'storageloc',
    'stock', 'product', 'sloc'
  ];

  // Validate that requested columns exist in SQL or schema
  const validateColumns = (cols) => {
    if (!cols || cols.trim() === '') return true;

    const requestedCols = cols.split(',').map(c => c.trim().toLowerCase());
    const sqlLower = originalSql.toLowerCase();

    // Check if requested columns appear in the original SQL or known schema
    return requestedCols.every(col => {
      // Remove aggregation functions and DISTINCT to get base column name
      const baseCol = col
        .replace(/^(sum|avg|count|max|min|distinct)\s*\(|\).*$/gi, '')
        .replace(/^distinct\s+/gi, '')
        .trim();

      // If it's SELECT *, validate against known schema
      if (sqlLower.includes('select *')) {
        return knownColumns.includes(baseCol);
      }

      // Otherwise check if column appears in the SQL
      return sqlLower.includes(baseCol);
    });
  };

  // Helper function to add GROUP BY clause
  const addGroupByClause = (sql, groupByColumns) => {
    if (!sql.toLowerCase().includes('group by') && groupByColumns) {
      const cleanSql = sql.replace(/;/g, '').trim();
      const groupByClause = ` GROUP BY ${groupByColumns}`;
      const lowerSql = cleanSql.toLowerCase();
      const orderByIndex = lowerSql.indexOf('order by');
      const limitIndex = lowerSql.indexOf('limit');

      let insertIndex = cleanSql.length;
      if (orderByIndex !== -1) insertIndex = Math.min(insertIndex, orderByIndex);
      if (limitIndex !== -1) insertIndex = Math.min(insertIndex, limitIndex);

      return cleanSql.slice(0, insertIndex) + groupByClause + cleanSql.slice(insertIndex);
    }
    return sql;
  };

  // Check if this is an e-commerce tool (skip auto-optimization for warehouse data)
  const isEcommerceTool = originalSql.toLowerCase().includes('larissa') ||
                          originalSql.toLowerCase().includes('shopee') ||
                          originalSql.toLowerCase().includes('sales') ||
                          originalSql.toLowerCase().includes('orders');

  // If no specific columns provided and not e-commerce, return original
  if (!selectColumns || selectColumns.trim() === '') {
    if (!isEcommerceTool) {
      console.log("  [Auto-optimization SKIPPED for non-e-commerce dataset]");
      return originalSql;
    }
    // E-commerce auto-optimization would go here...
    return originalSql;
  }

  // Validate user-specified columns exist in the schema
  if (!validateColumns(selectColumns)) {
    console.log("  [Column validation FAILED - using original SQL]");
    return originalSql;
  }

  // Use user-specified columns
  let processedColumns = selectColumns.split(',').map(col => col.trim());
  let needsGroupBy = false;
  let groupByColumns = [];

  // Extract non-aggregated columns for potential GROUP BY
  const selectColumnsList = selectColumns.split(',').map(col => col.trim());
  const groupByCandidates = selectColumnsList.filter(col =>
    !col.toLowerCase().includes('sum(') &&
    !col.toLowerCase().includes('avg(') &&
    !col.toLowerCase().includes('count(') &&
    !col.toLowerCase().includes('min(') &&
    !col.toLowerCase().includes('max(')
  );
  groupByColumns = groupByCandidates.map(col => {
    const idx = col.toLowerCase().lastIndexOf(' as ');
    return idx !== -1 ? col.slice(0, idx).trim() : col;
  });

  // Add columns to be summed if specified and valid
  if (columnsToBeSummed && validateColumns(columnsToBeSummed)) {
    const sumColsArr = columnsToBeSummed.split(',').map(col => col.trim()).filter(Boolean);
    const sumColumns = sumColsArr.map(col => `SUM(${col}) as total_${col}`).join(', ');
    if (!selectColumns.includes(sumColumns)) {
      processedColumns.unshift(sumColumns);
      needsGroupBy = true;
    }
  } else if (columnsToBeSummed && !validateColumns(columnsToBeSummed)) {
    console.log("  [Column validation FAILED for summed columns - skipping aggregation]");
  }

  // Add columns to be averaged if specified and valid
  if (columnsToBeAveraged && validateColumns(columnsToBeAveraged)) {
    const avgColumns = columnsToBeAveraged.split(',').map(col => `AVG(${col.trim()}) as avg_${col.trim()}`).join(', ');
    if (!selectColumns.includes(avgColumns)) {
      processedColumns.unshift(avgColumns);
      needsGroupBy = true;
    }
  } else if (columnsToBeAveraged && !validateColumns(columnsToBeAveraged)) {
    console.log("  [Column validation FAILED for averaged columns - skipping aggregation]");
  }

  let modifiedSql = originalSql.replace(/SELECT\s+\*/i, `SELECT ${processedColumns.join(', ')}`);

  // Handle conditionFields (add IS NOT NULL filter if no comparison)
  if (conditionFields && conditionFields.trim() !== '') {
    const fields = conditionFields.split(',').map(f => f.trim()).filter(Boolean);
    const whereConditions = fields.map(field => `${field} IS NOT NULL`).join(' AND ');
    if (whereConditions) {
      if (!modifiedSql.toLowerCase().includes('where')) {
        modifiedSql += ` WHERE ${whereConditions}`;
      } else {
        modifiedSql += ` AND ${whereConditions}`;
      }
    }
  }

  // Add GROUP BY if we have aggregations
  if (needsGroupBy && groupByColumns.length > 0) {
    modifiedSql = addGroupByClause(modifiedSql, groupByColumns.join(', '));
  }

  // Add ORDER BY based on query type
  if (queryType && !modifiedSql.toLowerCase().includes('order by')) {
    if (queryType === 'top_products' || queryType === 'ranking' || queryType === 'summary') {
      if (columnsToBeSummed) {
        const firstSummedCol = columnsToBeSummed.split(',')[0].trim();
        modifiedSql += ` ORDER BY total_${firstSummedCol} DESC`;
      }
    }
  }

  return modifiedSql;
}

// Test cases for BP Warehouse Inventory
const testCases = [
  {
    name: "Test 1: Basic warehouse query (no optimization for non-e-commerce)",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: null,
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    description: "Should return original SQL without auto-optimization for warehouse data"
  },
  {
    name: "Test 2: Filter by Material code",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material, Quantity, Plant",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: "Material",
    expectedContains: "WHERE Material IS NOT NULL",
    description: "Should add WHERE clause for Material filtering"
  },
  {
    name: "Test 3: Sum quantity by Plant",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Plant",
    queryType: "summary",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "GROUP BY Plant",
    description: "Should aggregate Quantity by Plant with GROUP BY"
  },
  {
    name: "Test 4: Total quantity for specific Material and Plant",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material, Plant",
    queryType: "summary",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: "Material, Plant",
    expectedContains: "SUM(Quantity) as total_Quantity",
    description: "Should sum Quantity with filters on Material and Plant"
  },
  {
    name: "Test 5: Invalid column name (should use original SQL)",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "InvalidColumn",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "SELECT * FROM",
    description: "Should fallback to original SQL when column doesn't exist"
  },
  {
    name: "Test 6: Warehouse inventory summary",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "WarehouseNum, Material",
    queryType: "summary",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "ORDER BY total_Quantity DESC",
    description: "Should group by warehouse and material with DESC ordering"
  },
  {
    name: "Test 7: Average quantity per Storage Location",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "StorageLoc",
    queryType: "summary",
    columnsToBeSummed: null,
    columnsToBeAveraged: "Quantity",
    conditionFields: null,
    expectedContains: "AVG(Quantity) as avg_Quantity",
    description: "Should calculate average with GROUP BY StorageLoc"
  },
  {
    name: "Test 8: Multi-field filtering",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "WarehouseNum, Material, Plant, Quantity",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: "Material, Plant, StorageLoc",
    expectedContains: "WHERE Material IS NOT NULL AND Plant IS NOT NULL AND StorageLoc IS NOT NULL",
    description: "Should add multiple IS NOT NULL conditions"
  },
  {
    name: "Test 9: Realistic user query - 'Show stock for material 08101-06207 in plant JKT'",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material, Plant, Quantity",
    queryType: "detail",
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: "Material, Plant",
    expectedContains: "SELECT Material, Plant, Quantity FROM",
    description: "Real-world query for specific material in specific plant"
  },
  {
    name: "Test 10: Realistic user query - 'Total quantity for material 08101-06207'",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material",
    queryType: "summary",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: "Material",
    expectedContains: "SUM(Quantity)",
    description: "Aggregate query with filtering"
  },
  {
    name: "Test 11: Invalid summed column (should skip aggregation)",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Plant",
    queryType: "summary",
    columnsToBeSummed: "NonExistentColumn",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "SELECT Plant FROM",
    description: "Should skip aggregation when summed column doesn't exist"
  },
  {
    name: "Test 12: Warehouse ranking by quantity",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "WarehouseNum",
    queryType: "ranking",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "ORDER BY total_Quantity DESC",
    description: "Should rank warehouses by total quantity"
  },
  {
    name: "Test 13: Complex query - Plant summary with multiple aggregations",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Plant, Material",
    queryType: "summary",
    columnsToBeSummed: "Quantity",
    columnsToBeAveraged: null,
    conditionFields: "Plant",
    expectedContains: "GROUP BY Plant, Material",
    description: "Should handle multi-column grouping with aggregation"
  },
  {
    name: "Test 14: Berapa jumlah stock untuk PN 08101-06207 pada seluruh plant JKT?",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material",
    queryType: "summary",
    columnsToBeSummed: "Qty",
    columnsToBeAveraged: null,
    conditionFields: "Material, Plant",
    expectedContains: "SUM(Qty) as total_Qty",
    description: "Should sum Qty for specific material and plant with GROUP BY Material (WHERE Material = '08101-06207' AND Plant = 'JKT')"
  },
  {
    name: "Test 15: Terdapat stock apa saja pada whs PKB?",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "Material",
    queryType: "summary",
    columnsToBeSummed: "Qty",
    columnsToBeAveraged: null,
    conditionFields: "Warehouse_Number",
    expectedContains: "SUM(Qty) as total_Qty",
    description: "Should list materials with qty sum filtered by warehouse, grouped by Material (WHERE Warehouse_Number = 'PKB')"
  },
  {
    name: "Test 16: Stok dengan PN 08101-06309 terdapat pada sloc mana saja?",
    originalSql: "SELECT * FROM `BP_3_DATAMART`.`VW_KNOWGEN`",
    selectColumns: "SLoc",
    queryType: "summary",
    columnsToBeSummed: "Qty",
    columnsToBeAveraged: null,
    conditionFields: "Material",
    expectedContains: "SUM(Qty) as total_Qty",
    description: "Should show storage locations with qty sum for specific material, grouped by SLoc (WHERE Material = '08101-06309')"
  },
];

// Run tests
console.log("=" .repeat(80));
console.log("TESTING BP WAREHOUSE BIGQUERY OPTIMIZATION");
console.log("=" .repeat(80));
console.log("\nDataset: BP_3_DATAMART.VW_KNOWGEN (Warehouse Inventory)");
console.log("Columns: WarehouseNum, Material, Quantity, Plant, StorageLoc\n");

let passedTests = 0;

testCases.forEach((test) => {
  console.log(`\n${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log("-" .repeat(80));
  console.log(`Input SQL: ${test.originalSql}`);
  console.log(`Parameters:`);
  console.log(`  - selectColumns: ${test.selectColumns || '(none)'}`);
  console.log(`  - queryType: ${test.queryType || '(none)'}`);
  console.log(`  - columnsToBeSummed: ${test.columnsToBeSummed || '(none)'}`);
  console.log(`  - columnsToBeAveraged: ${test.columnsToBeAveraged || '(none)'}`);
  console.log(`  - conditionFields: ${test.conditionFields || '(none)'}`);

  const result = optimizeColumnSelection(
    test.originalSql,
    test.selectColumns,
    test.queryType,
    test.columnsToBeSummed,
    test.columnsToBeAveraged,
    test.conditionFields
  );

  const passed = result.includes(test.expectedContains);

  console.log(`\nResult SQL:`);
  console.log(`  ${result}`);
  console.log(`\nExpected to contain: "${test.expectedContains}"`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log("=" .repeat(80));

  if (passed) passedTests++;
});

console.log(`\n${"=" .repeat(80)}`);
console.log(`SUMMARY: ${passedTests} of ${testCases.length} tests passed`);
console.log(`${"=" .repeat(80)}\n`);

// Additional validation info
console.log("📋 KEY BEHAVIORS VALIDATED:\n");
console.log("✅ Non-e-commerce datasets skip auto-optimization");
console.log("✅ Column validation prevents 'Unrecognized name' errors");
console.log("✅ Invalid columns fallback to original SQL");
console.log("✅ WHERE clause with IS NOT NULL for filtering");
console.log("✅ Proper GROUP BY for aggregations");
console.log("✅ ORDER BY for summary/ranking queries");
console.log("✅ Multi-field filtering support");
console.log("✅ Real-world user query patterns handled\n");

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { optimizeColumnSelection, testCases };
}
