/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  SizeColumnsToFitGridStrategy,
  ModuleRegistry,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  RowStyle,
  RowClassParams,
  themeQuartz,
  GridReadyEvent,
  GridApi,
  // PaginationModule,
  PaginationNumberFormatterParams,
  FirstDataRenderedEvent,
  ColDef,
  ColGroupDef,
  GridOptions,
  NumberEditorModule,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
  createGrid,
  PaginationChangedEvent,
  RenderApiModule, // Add this import
  RowApiModule, // Add this import
  RowStyleModule,
  RowDragModule,
  CellStyleModule,
  RowAutoHeightModule, // Add this import
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// Register all required AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  // PaginationModule,
  NumberEditorModule,
  TextEditorModule,
  TextFilterModule,
  NumberFilterModule,
  RowSelectionModule,
  ValidationModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  RowDragModule,
  CellStyleModule,
  RowAutoHeightModule, // Add this module registration
]);

// Create a custom event for theme changes
const THEME_CHANGE_EVENT = "app-theme-change";

export interface TableComponentProps {
  rowData?: any[];
  columnDefs: ColDef[];
  loading?: boolean;
  setRowSelection?: (row: any) => void;
  dataOnly?: boolean;
  additionalButton?: React.ReactNode;
  rightSection?: React.ReactNode;
  pagination?: boolean;
  suppressPaginationPanel?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];
  onGridReady?: (params: GridReadyEvent) => void;
  onPaginationChanged?: (event: PaginationChangedEvent) => void;
  onFirstDataRendered?: (params: FirstDataRenderedEvent) => void;
  initialPage?: number;
  filters?: any[];
  quickFilterText?: string;
  onFilterChanged?: (filters: any) => void;
  showQuickFilter?: boolean;
  totalData?: number;
  // Add new props for performance optimization
  suppressLoadingOverlay?: boolean;
  animateRows?: boolean;
  suppressColumnVirtualisation?: boolean;
  suppressRowVirtualisation?: boolean;
  domLayout?: "normal" | "autoHeight" | "print";
  rowHeight?: number;
  headerHeight?: number;
}

// Define a ref interface that exposes the grid API
export interface TableComponentHandle {
  getGridApi: () => GridApi | undefined;
}

const TableComponent = forwardRef<TableComponentHandle, TableComponentProps>(
  (props, ref) => {
    const {
      rowData = [],
      columnDefs = [],
      loading = false,
      dataOnly = false,
      pagination = true,
      suppressPaginationPanel = false,
      paginationPageSize = 10,
      paginationPageSizeSelector = [10, 25, 50],
      onGridReady: propsOnGridReady,
      onPaginationChanged,
      onFirstDataRendered,
      initialPage,
      filters,
      quickFilterText,
      onFilterChanged,
      showQuickFilter = true,
      totalData = 0,
      // Add new props with defaults
      suppressLoadingOverlay = false,
      animateRows = true,
      suppressColumnVirtualisation = false,
      suppressRowVirtualisation = false,
      domLayout = "normal",
      rowHeight = 48,
      headerHeight = 48,
    } = props;

    // State to track dark mode
    const [isDarkMode, setIsDarkMode] = useState(false);
    const gridRef = useRef<AgGridReact>(null);

    const handleGridReady = useCallback(
      (params: GridReadyEvent) => {
        // Delay operations to ensure the grid is fully initialized
        setTimeout(() => {
          // Only call sizeColumnsToFit if we have columns and the API is ready
          if (params.api && columnDefs?.length > 0) {
            params.api.sizeColumnsToFit();
          }

          // Apply initial filters if provided
          if (params.api && filters) {
            params.api.setFilterModel(filters);
          }

          // Apply initial quick filter if provided
          if (params.api && quickFilterText !== undefined) {
            params.api.setGridOption("quickFilterText", quickFilterText);
          }

          // Forward the event to the parent component if needed
          if (propsOnGridReady) {
            propsOnGridReady(params);
          }
        }, 0);
      },
      [propsOnGridReady, filters, quickFilterText, columnDefs]
    );

    // Expose the grid API via ref
    useImperativeHandle(ref, () => ({
      getGridApi: () => gridRef.current?.api,
    }));

    // Listen for theme changes
    useEffect(() => {
      // Function to check if dark mode is enabled
      const checkDarkMode = () => {
        // Get theme from local storage
        const storedTheme = localStorage.getItem("theme");

        // If theme is explicitly set to 'dark' in local storage, use dark mode
        if (storedTheme === "dark") {
          setIsDarkMode(true);
          return;
        }

        // If theme is explicitly set to 'light' in local storage, use light mode
        if (storedTheme === "light") {
          setIsDarkMode(false);
          return;
        }

        // If no theme in local storage, check tailwind preference
        const prefersDark = document.documentElement.classList.contains("dark");
        setIsDarkMode(prefersDark);
      };

      // Initial check
      checkDarkMode();

      // Create a MutationObserver to watch for class changes on the html element
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            checkDarkMode();
          }
        });
      });

      // Start observing the document with the configured parameters
      observer.observe(document.documentElement, { attributes: true });

      // Set up event listener for storage changes from other tabs/windows
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === "theme") {
          checkDarkMode();
        }
      };

      // Listen for changes to local storage
      window.addEventListener("storage", handleStorageChange);

      // Set up listener for system preference changes
      const darkModeMediaQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );
      const handleMediaChange = () => checkDarkMode();
      darkModeMediaQuery.addEventListener("change", handleMediaChange);

      // Listen for custom theme change events from within the app
      const handleThemeChangeEvent = () => checkDarkMode();
      window.addEventListener(THEME_CHANGE_EVENT, handleThemeChangeEvent);

      // This makes sure we're getting the theme from localStorage during app runtime
      // Set up interval to check theme (fallback for cases when change event isn't fired)
      const intervalId = setInterval(checkDarkMode, 1000);

      // Create a proxy for localStorage setItem to detect theme changes within the same window
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function (key, value) {
        // Call the original function first
        originalSetItem.apply(this, [key, value]);

        // If the theme is changing, dispatch our custom event
        if (key === "theme") {
          window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
        }
      };

      return () => {
        // Clean up event listeners
        window.removeEventListener("storage", handleStorageChange);
        darkModeMediaQuery.removeEventListener("change", handleMediaChange);
        window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChangeEvent);
        observer.disconnect();
        clearInterval(intervalId);

        // Restore original localStorage.setItem
        localStorage.setItem = originalSetItem;
      };
    }, []);

    const defaultColDef = useMemo(() => {
      return {
        filter: true,
        floatingFilter: false,
        resizable: true,
        sortable: true,
        minWidth: 100,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          padding: "8px",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        },
        filterParams: {
          filterOptions: ["contains", "equals", "startsWith", "endsWith"],
          defaultOption: "contains",
          caseSensitive: false,
          debounceMs: 300,
          trimInput: true,
        },
      };
    }, []);

    const autoSizeStrategy: SizeColumnsToFitGridStrategy = {
      type: "fitGridWidth",
      defaultMinWidth: 100,
    };

    // Light theme
    const lightTheme = useMemo(() => {
      return themeQuartz.withParams({
        // Basic colors
        backgroundColor: "#ffffff",
        foregroundColor: "#333333",

        // Header
        headerBackgroundColor: "#f5f5f5",
        headerTextColor: "#333333",

        // Rows
        oddRowBackgroundColor: "#ffffff",
        rowHoverColor: "#f9f9f9",
        selectedRowBackgroundColor: "rgba(0,0,0,0.04)",

        // Borders
        borderColor: "#e0e0e0",
        headerColumnResizeHandleColor: "#cccccc",

        // Fonts
        fontSize: "14px",
        fontFamily: "inherit",
      });
    }, []);

    // Dark theme
    const darkTheme = useMemo(() => {
      return themeQuartz.withParams({
        // Basic colors
        backgroundColor: "#302F34",
        foregroundColor: "#E0E0E0",

        // Header
        headerBackgroundColor: "#302F34",
        headerTextColor: "#E0E0E0",

        // Rows
        oddRowBackgroundColor: "#302F34",
        rowHoverColor: "rgba(48,47,52,0.7)",
        selectedRowBackgroundColor: "rgba(255,255,255,0.05)",

        // Borders
        borderColor: "rgba(88,88,88,.3)",
        headerColumnResizeHandleColor: "rgba(224,224,224,0.3)",

        // Fonts
        fontSize: "14px",
        fontFamily: "inherit",
      });
    }, []);

    // Choose theme based on dark mode state
    const currentTheme = useMemo(() => {
      return isDarkMode ? darkTheme : lightTheme;
    }, [isDarkMode, darkTheme, lightTheme]);

    // Force grid refresh when theme changes
    useEffect(() => {
      if (gridRef.current?.api) {
        // Refresh the grid UI when theme changes
        gridRef.current.api.refreshCells({ force: true });
        gridRef.current.api.refreshHeader();
        gridRef.current.api.redrawRows();
        // Only call sizeColumnsToFit if we have columns
        if (columnDefs && columnDefs.length > 0) {
          gridRef.current.api.sizeColumnsToFit();
        }
      }
    }, [isDarkMode, columnDefs]);

    const getRowStyle = (params: RowClassParams): RowStyle => {
      const baseStyle: RowStyle = {
        borderBottom: isDarkMode
          ? "1px solid rgba(88, 88, 88, 0.3)"
          : "1px solid rgba(224, 224, 224, 0.3)",
        height: `${rowHeight}px`,
      };

      if (params.data?.isDeleted) {
        return {
          ...baseStyle,
          background: "var(--deleted-row-bg)",
        };
      }

      return baseStyle;
    };

    const LoadingOverlay: React.FC<{ loadingMessage: string }> = ({
      loadingMessage,
    }) => (
      <div
        className={`ag-overlay-loading-center ${
          isDarkMode ? "text-gray-200" : "text-gray-700"
        }`}
      >
        <i className="fas fa-spinner fa-spin mr-2"></i>
        {loadingMessage}
      </div>
    );

    if (!columnDefs || columnDefs.length === 0) {
      return (
        <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={`${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
            >
              Initializing grid...
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ag-theme-custom">
        <div className="w-full h-full">
          <AgGridReact
            theme={currentTheme}
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoSizeStrategy={autoSizeStrategy}
            getRowStyle={getRowStyle}
            onGridReady={handleGridReady}
            // pagination={pagination}
            // paginationPageSize={paginationPageSize}
            // paginationPageSizeSelector={paginationPageSizeSelector}
            // suppressPaginationPanel={suppressPaginationPanel}
            // onPaginationChanged={onPaginationChanged}
            onFirstDataRendered={onFirstDataRendered}
            domLayout={domLayout}
            suppressScrollOnNewData={true}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            rowDragManaged={true}
            animateRows={animateRows}
            loadingOverlayComponent={LoadingOverlay}
            loadingOverlayComponentParams={{
              loadingMessage: "Loading...",
            }}
            overlayNoRowsTemplate={`
                    <span class="ag-overlay-loading-center ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }">
                        No rows to show
                    </span>
                `}
            overlayLoadingTemplate={`
                    <span class="ag-overlay-loading-center ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }">
                        Please wait while your rows are loading
                    </span>
                `}
            loading={loading && !suppressLoadingOverlay}
            suppressColumnVirtualisation={suppressColumnVirtualisation}
            suppressRowVirtualisation={suppressRowVirtualisation}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            rowSelection="multiple"
            rowMultiSelectWithClick={true}
            suppressRowClickSelection={true}
            suppressCellFocus={false}
            suppressMovableColumns={false}
            suppressFieldDotNotation={true}
            suppressCopyRowsToClipboard={false}
            suppressClipboardPaste={false}
            suppressLastEmptyLineOnPaste={true}
            suppressMenuHide={false}
            suppressRowDeselection={false}
            suppressRowHoverHighlight={false}
            suppressAutoSize={false}
            suppressDragLeaveHidesColumns={true}
            suppressMakeColumnVisibleAfterUnGroup={true}
            suppressCsvExport={false}
            suppressExcelExport={false}
            suppressPropertyNamesCheck={true}
            suppressMaxRenderedRowRestriction={true}
            suppressColumnMoveAnimation={true}
            suppressAggFuncInHeader={true}
            suppressLoadingOverlay={suppressLoadingOverlay}
            suppressNoRowsOverlay={false}
            suppressRowTransform={true}
            suppressBrowserResizeObserver={false}
            suppressHorizontalScroll={false}
            suppressClickEdit={false}
            suppressContextMenu={false}
            suppressFocusAfterRefresh={false}
            alwaysShowVerticalScroll={false}
            debounceVerticalScrollbar={true}
            suppressAnimationFrame={false}
            suppressMiddleClickScrolls={true}
            suppressPreventDefaultOnMouseWheel={true}
            suppressTouch={false}
            suppressModelUpdateAfterUpdateTransaction={false}
            tooltipShowDelay={1000}
            tooltipHideDelay={10000}
            // This is the key change to fix tooltip z-index issues
            popupParent={document.body}
            // paginationNumberFormatter={(params: PaginationNumberFormatterParams) => {
            //     return params.value.toLocaleString();
            // }}
          />
        </div>
      </div>
    );
  }
);

TableComponent.displayName = "TableComponent";

export default TableComponent;
