// Test script for optimizeColumnSelection function
// This script simulates the behavior of the function without connecting to a database

// Mock implementation of the optimizeColumnSelection function
function optimizeColumnSelection(
  originalSql, 
  selectColumns, 
  queryType, 
  columnsToBeSummed, 
  columnsToBeAveraged,
  conditionFields,
  comparisonPeriods,
  comparisonField,
  columnListMeta
) {
  // Helper: parse columnListMeta like "col1(STRING), col2(INTEGER)"
  const parseMeta = (metaStr) => {
    const map = {};
    if (!metaStr || typeof metaStr !== 'string') return map;
    metaStr.split(',').forEach(entry => {
      const match = entry.trim().match(/([^()]+)\(([^()]+)\)/);
      if (match) {
        const name = match[1].trim();
        const type = match[2].trim().toUpperCase();
        map[name] = type;
      }
    });
    return map;
  };

  const metaMap = parseMeta(columnListMeta);

  // Helper: determine if a column is stored as STRING and looks date-like
  const isStringDateLike = (field) => {
    const t = metaMap[field];
    return t === 'STRING';
  };

  // Helper: get expression for field respecting type (cast if needed)
  const fieldExpr = (field) => {
    if (isStringDateLike(field)) {
      return `CAST(${field} AS TIMESTAMP)`;
    }
    return field;
  };

  // Helper: month name to number (supports EN and ID)
  const monthMap = {
    'january': 1, 'januari': 1,
    'february': 2, 'februari': 2,
    'march': 3, 'maret': 3,
    'april': 4,
    'may': 5, 'mei': 5,
    'june': 6, 'juni': 6,
    'july': 7, 'juli': 7,
    'august': 8, 'agustus': 8,
    'september': 9,
    'october': 10, 'oktober': 10,
    'november': 11,
    'december': 12, 'desember': 12
  };

  // Helper: build WHERE for comparison periods given a field
  const buildComparisonWhereByField = (periodsStr, field) => {
    if (!periodsStr || !field) return '';
    const expr = fieldExpr(field);
    const rawPeriods = periodsStr.split(',').map(p => p.trim()).filter(Boolean);
    if (rawPeriods.length === 0) return '';

    const conditions = [];
    for (const token of rawPeriods) {
      // Try "MonthName YYYY"
      const monthYearMatch = token.match(/^(\w+)\s+(\d{4})$/i);
      if (monthYearMatch) {
        const mName = monthYearMatch[1].toLowerCase();
        const year = parseInt(monthYearMatch[2], 10);
        const month = monthMap[mName];
        if (year && month) {
          conditions.push(`(EXTRACT(YEAR FROM ${expr}) = ${year} AND EXTRACT(MONTH FROM ${expr}) = ${month})`);
          continue;
        }
      }
      // Try "YYYY-MM"
      const yearMonthMatch = token.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        const year = parseInt(yearMonthMatch[1], 10);
        const month = parseInt(yearMonthMatch[2], 10);
        if (year && month) {
          conditions.push(`(EXTRACT(YEAR FROM ${expr}) = ${year} AND EXTRACT(MONTH FROM ${expr}) = ${month})`);
          continue;
        }
      }
      // Try explicit range "YYYY-MM-DD,YYYY-MM-DD" (handled outside this helper in previous tests)
    }

    if (conditions.length === 0) return '';
    return `${conditions.join(' OR ')}`;
  };

  // Helper function to add GROUP BY clause intelligently
  const addGroupByClause = (sql, groupByColumns) => {
    if (!sql.toLowerCase().includes('group by') && groupByColumns) {
      // Remove ALL semicolons first, not just trailing ones
      const cleanSql = sql.replace(/;/g, '').trim();
      
      const groupByClause = ` GROUP BY ${groupByColumns}`;
      // Insert GROUP BY before ORDER BY, LIMIT, or at the end
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

  // If user provided specific columns, use those directly
  if (selectColumns && selectColumns.trim() !== '') {
    // Use user-specified columns directly
    let modifiedSql = originalSql.replace(/SELECT\s+\*/i, `SELECT ${selectColumns}`);
    
    // Track if we need to add GROUP BY
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
    
    // Add aggregation for columns to be summed if specified
    if (columnsToBeSummed && columnsToBeSummed.trim() !== '') {
      const sumColsArr = columnsToBeSummed.split(',').map(col => col.trim()).filter(Boolean);
      const singleSum = sumColsArr.length === 1 && queryType === 'comparison';
      const sumColumns = singleSum
        ? `SUM(${sumColsArr[0]}) as total_amount`
        : sumColsArr.map(col => `SUM(${col}) as total_${col}`).join(', ');
      if (!selectColumns.includes(sumColumns)) {
        modifiedSql = modifiedSql.replace(/SELECT\s+/i, `SELECT ${sumColumns}, `);
        needsGroupBy = true;
      }
    }
    
    // Add aggregation for columns to be averaged if specified
    if (columnsToBeAveraged && columnsToBeAveraged.trim() !== '') {
      const avgColumns = columnsToBeAveraged.split(',').map(col => `AVG(${col.trim()}) as avg_${col.trim()}`).join(', ');
      if (!selectColumns.includes(avgColumns)) {
        modifiedSql = modifiedSql.replace(/SELECT\s+/i, `SELECT ${avgColumns}, `);
        needsGroupBy = true;
      }
    }
    

    // Add GROUP BY if we have aggregations and non-aggregated columns
    // Defer GROUP BY insertion until after WHERE to keep valid order

    // Handle conditionFields without comparison periods (add IS NOT NULL filter)
    if (conditionFields && conditionFields.trim() !== '' && (!comparisonPeriods || comparisonPeriods.trim() === '')) {
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

    // Handle comparison periods for date comparisons
    if (queryType === 'comparison' && conditionFields && conditionFields.trim() !== '') {
      const dateField = conditionFields.trim();
      const cmpField = comparisonField || dateField;
      if (comparisonPeriods && comparisonPeriods.trim() !== '') {
        const monthWhere = buildComparisonWhereByField(comparisonPeriods, cmpField);
        if (monthWhere) {
          if (!modifiedSql.toLowerCase().includes('where')) {
            modifiedSql += ` WHERE ${monthWhere}`;
          } else {
            modifiedSql += ` AND ${monthWhere}`;
          }
        } else {
          const periods = comparisonPeriods.split(';').map(p => p.trim()).filter(Boolean);
          const whereConditions = periods.map(period => {
            const [startDate, endDate] = period.split(',');
            const start = (startDate || '').trim();
            const end = (endDate || '').trim();
            const expr = fieldExpr(cmpField);
            if (expr.startsWith('CAST(')) {
              return `(${expr} BETWEEN TIMESTAMP('${start}') AND TIMESTAMP('${end}'))`;
            }
            return `(${cmpField} BETWEEN '${start}' AND '${end}')`;
          }).join(' OR ');
          if (!modifiedSql.toLowerCase().includes('where')) {
            modifiedSql += ` WHERE ${whereConditions}`;
          } else {
            modifiedSql += ` AND (${whereConditions})`;
          }
        }
      }
    }
    
    if (needsGroupBy && groupByColumns.length > 0) {
      modifiedSql = addGroupByClause(modifiedSql, groupByColumns.join(', '));
    }

    // Add ORDER BY based on query type if not already present
    if (queryType && !modifiedSql.toLowerCase().includes('order by')) {
      if (queryType === 'top_products' || queryType === 'ranking') {
        // For top products or ranking, order by the summed column in descending order
        if (columnsToBeSummed) {
          const firstSummedCol = columnsToBeSummed.split(',')[0].trim();
          modifiedSql += ` ORDER BY total_${firstSummedCol} DESC`;
        }
      } else if (queryType === 'comparison') {
        // For comparison queries, order by the summed column descending
        if (columnsToBeSummed) {
          const sumColsArr = columnsToBeSummed.split(',').map(col => col.trim()).filter(Boolean);
          if (sumColsArr.length === 1) {
            modifiedSql += ` ORDER BY total_${sumColsArr[0]} DESC`;
          } else {
            const firstSummedCol = sumColsArr[0];
            modifiedSql += ` ORDER BY total_${firstSummedCol} DESC`;
          }
        }
      } else if (queryType === 'trend') {
        // For trends, order by date/time column if present in processedColumns
        const selectColumnsList = selectColumns.split(',').map(col => col.trim());
        const timeCol = selectColumnsList.find(col => {
          const lowerCol = col.toLowerCase();
          return (lowerCol.includes('date') ||
            lowerCol.includes('time') ||
            lowerCol.includes('month')) &&
            !lowerCol.includes('sum(') &&
            !lowerCol.includes('avg(') &&
            !lowerCol.includes('count(');
        });

        if (timeCol) {
          // Extract the column name or alias for ORDER BY
          const aliasMatch = timeCol.match(/\s+as\s+(\w+)\s*$/i);
          const orderByCol = aliasMatch ? aliasMatch[1] : timeCol.split('.').pop()?.trim() || timeCol;
          modifiedSql += ` ORDER BY ${orderByCol} ASC`;
        }
      }
    }

    return modifiedSql;
  }
  
  // If no specific columns provided, return the original SQL
  return originalSql;
}

// Test cases
const testCases = [
  {
    name: "Test 1: Basic column selection",
    originalSql: "SELECT * FROM products",
    selectColumns: "product_name, category, price",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "SELECT product_name, category, price FROM products"
  },
  {
    name: "Test 2: Column selection with summing",
    originalSql: "SELECT * FROM sales",
    selectColumns: "product_id, date",
    queryType: null,
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "GROUP BY product_id, date"
  },
  {
    name: "Test 3: Column selection with averaging",
    originalSql: "SELECT * FROM products",
    selectColumns: "category",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: "price",
    conditionFields: null,
    expectedContains: "GROUP BY category"
  },
  {
    name: "Test 4: Using queryType for top products",
    originalSql: "SELECT * FROM sales",
    selectColumns: "product_id, product_name",
    queryType: "top_products",
    columnsToBeSummed: "quantity",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "ORDER BY total_quantity DESC"
  },
  {
    name: "Test 5: Using queryType for trend analysis",
    originalSql: "SELECT * FROM sales",
    selectColumns: "date, product_category",
    queryType: "trend",
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "ORDER BY date ASC"
  },
  {
    name: "Test 6: Using conditionFields parameter",
    originalSql: "SELECT * FROM customers",
    selectColumns: "customer_name, region",
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: "last_purchase_date",
    expectedContains: "WHERE last_purchase_date IS NOT NULL"
  },
  {
    name: "Test 7: No specific columns provided",
    originalSql: "SELECT * FROM products WHERE category = 'Electronics'",
    selectColumns: null,
    queryType: null,
    columnsToBeSummed: null,
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "SELECT * FROM products WHERE category = 'Electronics'"
  },
  {
    name: "Test 8: Top sales by demography",
    originalSql: "SELECT * FROM sales",
    selectColumns: "region, customer_age_group",
    queryType: "top_products",
    columnsToBeSummed: "sales_count",
    columnsToBeAveraged: null,
    conditionFields: null,
    expectedContains: "ORDER BY total_sales_count DESC"
  },
  {
    name: "Test 9: Sales comparison with static dates",
    originalSql: "SELECT * FROM sales",
    selectColumns: "product_category",
    queryType: "comparison",
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: "sale_date",
    comparisonPeriods: "2023-01-01,2023-01-31;2023-02-01,2023-02-28",
    expectedContains: "WHERE (sale_date BETWEEN '2023-01-01' AND '2023-01-31') OR (sale_date BETWEEN '2023-02-01' AND '2023-02-28')"
  },
  {
    name: "Test 10: Sales comparison with datetime column",
    originalSql: "SELECT * FROM sales",
    selectColumns: "product_category, EXTRACT(MONTH FROM sale_date) as month",
    queryType: "comparison",
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: "sale_date",
    expectedContains: "GROUP BY product_category"
  },
  {
    name: "Test 11: Comparison using month names on STRING field",
    originalSql: "SELECT * FROM orders",
    selectColumns: "product_category",
    queryType: "comparison",
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: "waktu_pesanan_dibuat",
    comparisonPeriods: "August 2025, July 2025",
    comparisonField: "waktu_pesanan_dibuat",
    columnListMeta: "nomor_pesanan(STRING), waktu_pesanan_dibuat(STRING), harga_awal(INTEGER)",
    expectedContains: "WHERE (EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 2025 AND EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 8) OR (EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 2025 AND EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 7)"
  },
  {
    name: "Test 12: Comparison using YYYY-MM on TIMESTAMP field",
    originalSql: "SELECT * FROM orders",
    selectColumns: "product_category",
    queryType: "comparison",
    columnsToBeSummed: "amount",
    columnsToBeAveraged: null,
    conditionFields: "created_at",
    comparisonPeriods: "2025-08, 2025-07",
    comparisonField: "created_at",
    columnListMeta: "created_at(TIMESTAMP), product_category(STRING)",
    expectedContains: "WHERE (EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 8) OR (EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 7)"
  },
  {
    name: "Test 13: BigQuery comparison with month/year grouping and aliases",
    originalSql: "SELECT * FROM `int-me-knowgen.tes.larissa`",
    selectColumns: "EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) as bulan, EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) as tahun",
    queryType: "comparison",
    columnsToBeSummed: "jumlah",
    columnsToBeAveraged: null,
    conditionFields: "waktu_pesanan_dibuat",
    comparisonPeriods: "August 2025, July 2025",
    comparisonField: "waktu_pesanan_dibuat",
    columnListMeta: "waktu_pesanan_dibuat(STRING)",
    expectedEquals: "SELECT SUM(jumlah) as total_amount, EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) as bulan, EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) as tahun FROM `int-me-knowgen.tes.larissa` WHERE (EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 2025 AND EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 8) OR (EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 2025 AND EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = 7) GROUP BY EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)), EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) ORDER BY total_jumlah DESC"
  },
  {
    name: "Test 14: Top products with custom columns must include ORDER BY DESC",
    originalSql: "SELECT * FROM `tes`.`larissa`",
    selectColumns: "nama_produk,jumlah",
    queryType: "top_products",
    columnsToBeSummed: "jumlah",
    columnsToBeAveraged: null,
    conditionFields: null,
    comparisonPeriods: null,
    comparisonField: null,
    columnListMeta: null,
    expectedContains: "ORDER BY total_jumlah DESC"
  }
];

// Run tests
console.log("TESTING optimizeColumnSelection FUNCTION\n");
let passedTests = 0;

testCases.forEach((test) => {
  const result = optimizeColumnSelection(
    test.originalSql,
    test.selectColumns,
    test.queryType,
    test.columnsToBeSummed,
    test.columnsToBeAveraged,
    test.conditionFields,
    test.comparisonPeriods,
    test.comparisonField,
    test.columnListMeta
  );
  
  let passed;
  if (test.expectedEquals) {
    passed = result.trim() === test.expectedEquals.trim();
  } else {
    passed = result.includes(test.expectedContains);
  }
  
  console.log(`${test.name}`);
  console.log(`Input: ${test.originalSql}`);
  console.log(`Parameters: selectColumns=${test.selectColumns}, queryType=${test.queryType}, columnsToBeSummed=${test.columnsToBeSummed}, columnsToBeAveraged=${test.columnsToBeAveraged}, conditionFields=${test.conditionFields}`);
  if (test.comparisonPeriods) console.log(`Comparison Periods: ${test.comparisonPeriods}`);
  if (test.comparisonField) console.log(`Comparison Field: ${test.comparisonField}`);
  if (test.columnListMeta) console.log(`Column Meta: ${test.columnListMeta}`);
  console.log(`Result: ${result}`);
  if (test.expectedEquals) {
    console.log(`Expected exactly: ${test.expectedEquals}`);
  } else {
    console.log(`Expected to contain: ${test.expectedContains}`);
  }
  console.log(`Test ${passed ? 'PASSED' : 'FAILED'}`);
  console.log("-".repeat(80));
  
  if (passed) passedTests++;
});

console.log(`\nSUMMARY: ${passedTests} of ${testCases.length} tests passed`);