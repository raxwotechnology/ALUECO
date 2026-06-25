import { Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerGroupsPage from './pages/CustomerGroupsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesOrderFormPage from './pages/SalesOrderFormPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AuditLogPage from './pages/AuditLogPage';
import SmsLogsPage from './pages/SmsLogsPage';
import WarehousesPage from './pages/WarehousesPage';
import StockPage from './pages/StockPage';
import OpeningStockPage from './pages/OpeningStockPage';
import StockTransferPage from './pages/StockTransferPage';
import StockAdjustmentPage from './pages/StockAdjustmentPage';
import StockMovementsPage from './pages/StockMovementsPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import FarmsPage from './pages/FarmsPage';
import FarmHarvestsPage from './pages/FarmHarvestsPage';
import GrnsPage from './pages/GrnsPage';
import RawMaterialsPage from './pages/RawMaterialsPage';
import InventoryConverterPage from './pages/InventoryConverterPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFromSalesOrderPage from './pages/InvoiceFromSalesOrderPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import BillsPage from './pages/BillsPage';
import BillDetailPage from './pages/BillDetailPage';
import BillFromGrnPage from './pages/BillFromGrnPage';
import PaymentsPage from './pages/PaymentsPage';
import PaymentFormPage from './pages/PaymentFormPage';
import PaymentDetailPage from './pages/PaymentDetailPage';
import ChequeLedgerPage from './pages/ChequeLedgerPage';
import BankAccountsPage from './pages/BankAccountsPage';
import BomsPage from './pages/BomsPage';
import BomFormPage from './pages/BomFormPage';
import BomDetailPage from './pages/BomDetailPage';
import InventoryRecipesPage from './pages/InventoryRecipesPage';
import InventoryRecipeFormPage from './pages/InventoryRecipeFormPage';
import ProductionOrdersPage from './pages/ProductionOrdersPage';
import ProductionOrderFormPage from './pages/ProductionOrderFormPage';
import ProductionOrderDetailPage from './pages/ProductionOrderDetailPage';
import BatchesPage from './pages/BatchesPage';
import ProcessTemplatesPage from './pages/ProcessTemplatesPage';
import InquiriesPage from './pages/InquiriesPage';
import QuotationsPage from './pages/QuotationsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import PettyCashPage from './pages/PettyCashPage';
import FixedAssetsPage from './pages/FixedAssetsPage';
import FleetPage from './pages/FleetPage';
import GatePassPage from './pages/GatePassPage';
import GateScreenPage from './pages/GateScreenPage';
import EmployeeOfMonthPage from './pages/EmployeeOfMonthPage';
import MaintenancePage from './pages/MaintenancePage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ImportDataPage from './pages/ImportDataPage';
import ReturnsPage from './pages/ReturnsPage';
import ReturnFormPage from './pages/ReturnFormPage';
import ReturnDetailPage from './pages/ReturnDetailPage';
import CreditNotesPage from './pages/CreditNotesPage';
import CreditNoteDetailPage from './pages/CreditNoteDetailPage';
import DamagesPage from './pages/DamagesPage';
import SupplierReturnsPage from './pages/SupplierReturnsPage';
import SupplierReturnDetailPage from './pages/SupplierReturnDetailPage';
import RepairsPage from './pages/RepairsPage';
import RepairDetailPage from './pages/RepairDetailPage';
import DailyPnLPage from './pages/DailyPnLPage';
import PosPage from './pages/PosPage';

import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DesignationsPage from './pages/DesignationsPage';
import ShiftsPage from './pages/ShiftsPage';
import AttendancePage from './pages/AttendancePage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import HolidaysPage from './pages/HolidaysPage';
import SalaryStructuresPage from './pages/SalaryStructuresPage';
import LeaveStructuresPage from './pages/LeaveStructuresPage';
import PayrollsPage from './pages/PayrollsPage';
import PayrollDetailPage from './pages/PayrollDetailPage';
import PayslipDetailPage from './pages/PayslipDetailPage';

import ReportsPage from './pages/ReportsPage';
import SalesSummaryReportPage from './pages/reports/SalesSummaryReportPage';
import SalesByProductReportPage from './pages/reports/SalesByProductReportPage';
import SalesByCustomerReportPage from './pages/reports/SalesByCustomerReportPage';
import StockValuationReportPage from './pages/reports/StockValuationReportPage';
import SlowFastMoversReportPage from './pages/reports/SlowFastMoversReportPage';
import LowStockReportPage from './pages/reports/LowStockReportPage';
import StockMovementReportPage from './pages/reports/StockMovementReportPage';
import ProductionReportPage from './pages/reports/ProductionReportPage';
import YieldForecasterPage from './pages/reports/YieldForecasterPage';
import ReturnsReportPage from './pages/reports/ReturnsReportPage';
import FinancialSnapshotPage from './pages/reports/FinancialSnapshotPage';
import HrReportsPage from './pages/reports/HrReportsPage';
import VarianceComparisonPage from './pages/reports/VarianceComparisonPage';
import ShiftReportingPage from './pages/reports/ShiftReportingPage';
import DailyStockStatusReportPage from './pages/reports/DailyStockStatusReportPage';
import FuturePredictionsPage from './pages/reports/FuturePredictionsPage';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProtectedRoute requiredPermission="products.view"><ProductsPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute requiredPermission="products.view"><CategoriesPage /></ProtectedRoute>} />
        <Route path="/brands" element={<ProtectedRoute requiredPermission="products.view"><BrandsPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute requiredPermission="customers.view"><CustomersPage /></ProtectedRoute>} />
        <Route path="/customer-groups" element={<ProtectedRoute requiredPermission="customers.view"><CustomerGroupsPage /></ProtectedRoute>} />
        <Route path="/sales-orders" element={<ProtectedRoute requiredPermission="sales.view"><SalesOrdersPage /></ProtectedRoute>} />
        <Route path="/sales-orders/new" element={<ProtectedRoute requiredPermission="sales.create"><SalesOrderFormPage /></ProtectedRoute>} />
        <Route path="/sales-orders/:id" element={<ProtectedRoute requiredPermission="sales.view"><SalesOrderDetailPage /></ProtectedRoute>} />
        <Route path="/warehouses" element={<ProtectedRoute requiredPermission="inventory.view"><WarehousesPage /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute requiredPermission="inventory.view"><StockPage /></ProtectedRoute>} />
        <Route path="/stock/opening" element={<ProtectedRoute requiredPermission="inventory.opening"><OpeningStockPage /></ProtectedRoute>} />
        <Route path="/stock/transfer" element={<ProtectedRoute requiredPermission="inventory.transfer"><StockTransferPage /></ProtectedRoute>} />
        <Route path="/stock/adjustment" element={<ProtectedRoute requiredPermission="inventory.adjust"><StockAdjustmentPage /></ProtectedRoute>} />
        <Route path="/stock/movements" element={<ProtectedRoute requiredPermission="inventory.view"><StockMovementsPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute requiredPermission="suppliers.view"><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute requiredPermission="purchasing.view"><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders/new" element={<ProtectedRoute requiredPermission="purchasing.view"><PurchaseOrderFormPage /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute requiredPermission="purchasing.view"><PurchaseOrderDetailPage /></ProtectedRoute>} />
        <Route path="/farms" element={<ProtectedRoute requiredPermission="grn.manage"><FarmsPage /></ProtectedRoute>} />
        <Route path="/farms/harvests" element={<ProtectedRoute requiredPermission="grn.manage"><FarmHarvestsPage /></ProtectedRoute>} />
        <Route path="/grns" element={<ProtectedRoute requiredPermission="grn.manage"><GrnsPage /></ProtectedRoute>} />
        <Route path="/inventory/raw-materials" element={<ProtectedRoute requiredPermission="inventory.view"><RawMaterialsPage /></ProtectedRoute>} />
        <Route path="/inventory/converter" element={<ProtectedRoute requiredPermission="inventory.adjust"><InventoryConverterPage /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute requiredPermission="invoices.view"><InvoicesPage /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute requiredPermission="invoices.create"><InvoiceFormPage /></ProtectedRoute>} />
        <Route path="/invoices/from-sales-order" element={<ProtectedRoute requiredPermission="invoices.create"><InvoiceFromSalesOrderPage /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute requiredPermission="invoices.view"><InvoiceDetailPage /></ProtectedRoute>} />
        <Route path="/bills" element={<ProtectedRoute requiredPermission="bills.view"><BillsPage /></ProtectedRoute>} />
        <Route path="/bills/from-grn" element={<ProtectedRoute requiredPermission="bills.manage"><BillFromGrnPage /></ProtectedRoute>} />
        <Route path="/bills/:id" element={<ProtectedRoute requiredPermission="bills.view"><BillDetailPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute requiredPermission="payments.view"><PaymentsPage /></ProtectedRoute>} />
        <Route path="/payments/new" element={<ProtectedRoute requiredPermission="payments.manage"><PaymentFormPage /></ProtectedRoute>} />
        <Route path="/payments/:id" element={<ProtectedRoute requiredPermission="payments.view"><PaymentDetailPage /></ProtectedRoute>} />
        <Route path="/finance/cheques" element={<ProtectedRoute requiredPermission="payments.view"><ChequeLedgerPage /></ProtectedRoute>} />
        <Route path="/finance/bank-accounts" element={<ProtectedRoute requiredPermission="payments.view"><BankAccountsPage /></ProtectedRoute>} />
        <Route path="/boms" element={<ProtectedRoute requiredPermission="bom.view"><BomsPage /></ProtectedRoute>} />
        <Route path="/boms/new" element={<ProtectedRoute requiredPermission="bom.manage"><BomFormPage /></ProtectedRoute>} />
        <Route path="/boms/:id" element={<ProtectedRoute requiredPermission="bom.view"><BomDetailPage /></ProtectedRoute>} />
        <Route path="/boms/:id/edit" element={<ProtectedRoute requiredPermission="bom.manage"><BomFormPage /></ProtectedRoute>} />
        <Route path="/inventory-recipes" element={<ProtectedRoute requiredPermission="bom.view"><InventoryRecipesPage /></ProtectedRoute>} />
        <Route path="/inventory-recipes/new" element={<ProtectedRoute requiredPermission="bom.manage"><InventoryRecipeFormPage /></ProtectedRoute>} />
        <Route path="/inventory-recipes/:id/edit" element={<ProtectedRoute requiredPermission="bom.manage"><InventoryRecipeFormPage /></ProtectedRoute>} />
        <Route path="/production-orders" element={<ProtectedRoute requiredPermission="production.view"><ProductionOrdersPage /></ProtectedRoute>} />
        <Route path="/production-orders/new" element={<ProtectedRoute requiredPermission="production.manage"><ProductionOrderFormPage /></ProtectedRoute>} />
        <Route path="/production-orders/:id" element={<ProtectedRoute requiredPermission="production.view"><ProductionOrderDetailPage /></ProtectedRoute>} />

        <Route path="/manufacturing/batches" element={<ProtectedRoute requiredPermission="production.view"><BatchesPage /></ProtectedRoute>} />
        <Route path="/manufacturing/templates" element={<ProtectedRoute requiredPermission="production.view"><ProcessTemplatesPage /></ProtectedRoute>} />

        <Route path="/crm/inquiries" element={<ProtectedRoute requiredPermission="customers.view"><InquiriesPage /></ProtectedRoute>} />
        <Route path="/crm/quotations" element={<ProtectedRoute requiredPermission="sales.view"><QuotationsPage /></ProtectedRoute>} />
        <Route path="/logistics/shipments" element={<ProtectedRoute requiredPermission="inventory.view"><ShipmentsPage /></ProtectedRoute>} />
        <Route path="/logistics/gate-passes" element={<ProtectedRoute requiredPermission="inventory.view"><GatePassPage /></ProtectedRoute>} />

        <Route path="/finance/petty-cash" element={<ProtectedRoute requiredPermission="payments.view"><PettyCashPage /></ProtectedRoute>} />
        <Route path="/finance/fixed-assets" element={<ProtectedRoute requiredPermission="payments.view"><FixedAssetsPage /></ProtectedRoute>} />
        <Route path="/fleet/vehicles" element={<ProtectedRoute requiredPermission="inventory.view"><FleetPage /></ProtectedRoute>} />
        <Route path="/maintenance/requests" element={<ProtectedRoute requiredPermission="admin.settings"><MaintenancePage /></ProtectedRoute>} />

        <Route path="/returns" element={<ProtectedRoute requiredPermission="returns.view"><ReturnsPage /></ProtectedRoute>} />
        <Route path="/returns/new" element={<ProtectedRoute requiredPermission="returns.manage"><ReturnFormPage /></ProtectedRoute>} />
        <Route path="/returns/:id" element={<ProtectedRoute requiredPermission="returns.view"><ReturnDetailPage /></ProtectedRoute>} />
        <Route path="/credit-notes" element={<ProtectedRoute requiredPermission="credit_notes.view"><CreditNotesPage /></ProtectedRoute>} />
        <Route path="/credit-notes/:id" element={<ProtectedRoute requiredPermission="credit_notes.view"><CreditNoteDetailPage /></ProtectedRoute>} />
        <Route path="/damages" element={<ProtectedRoute requiredPermission="damages.view"><DamagesPage /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute requiredPermission="pos.access"><PosPage /></ProtectedRoute>} />

        <Route path="/supplier-returns" element={<ProtectedRoute requiredPermission="supplier_returns.view"><SupplierReturnsPage /></ProtectedRoute>} />
        <Route path="/supplier-returns/:id" element={<ProtectedRoute requiredPermission="supplier_returns.view"><SupplierReturnDetailPage /></ProtectedRoute>} />
        <Route path="/repairs" element={<ProtectedRoute requiredPermission="repairs.view"><RepairsPage /></ProtectedRoute>} />
        <Route path="/repairs/:id" element={<ProtectedRoute requiredPermission="repairs.view"><RepairDetailPage /></ProtectedRoute>} />

        {/* HR Module */}
        {/* HR Module */}
        <Route path="/employees" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><EmployeesPage /></ProtectedRoute>} />
        <Route path="/employees/new" element={<ProtectedRoute requiredPermission="hr.employees.manage" excludeRoles={['employee']}><EmployeeFormPage /></ProtectedRoute>} />
        <Route path="/employees/:id" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><EmployeeDetailPage /></ProtectedRoute>} />
        <Route path="/employees/:id/edit" element={<ProtectedRoute requiredPermission="hr.employees.manage" excludeRoles={['employee']}><EmployeeFormPage /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><DepartmentsPage /></ProtectedRoute>} />
        <Route path="/designations" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><DesignationsPage /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><ShiftsPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute requiredPermission="hr.attendance.view" excludeRoles={['employee']}><AttendancePage /></ProtectedRoute>} />
        <Route path="/employees/month" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><EmployeeOfMonthPage /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute requiredPermission="hr.leaves.view" excludeRoles={['employee']}><LeaveRequestsPage /></ProtectedRoute>} />
        <Route path="/holidays" element={<ProtectedRoute requiredPermission="hr.employees.view" excludeRoles={['employee']}><HolidaysPage /></ProtectedRoute>} />
        <Route path="/salary-structures" element={<ProtectedRoute requiredPermission="hr.salary.view" excludeRoles={['employee']}><SalaryStructuresPage /></ProtectedRoute>} />
        <Route path="/leave-structures" element={<ProtectedRoute requiredPermission="hr.leaves.view" excludeRoles={['employee']}><LeaveStructuresPage /></ProtectedRoute>} />
        <Route path="/payroll" element={<ProtectedRoute requiredPermission="hr.payroll.view" excludeRoles={['employee']}><PayrollsPage /></ProtectedRoute>} />
        <Route path="/payroll/:id" element={<ProtectedRoute requiredPermission="hr.payroll.view" excludeRoles={['employee']}><PayrollDetailPage /></ProtectedRoute>} />
        <Route path="/payroll/:payrollId/payslip/:employeeId" element={<ProtectedRoute requiredPermission="hr.payroll.view"><PayslipDetailPage /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports" element={<ProtectedRoute requiredAnyPermission={['reports.sales', 'reports.financial', 'reports.inventory', 'reports.hr', 'reports.production']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/reports/sales" element={<ProtectedRoute requiredPermission="reports.sales"><SalesSummaryReportPage /></ProtectedRoute>} />
        <Route path="/reports/sales-by-product" element={<ProtectedRoute requiredPermission="reports.sales"><SalesByProductReportPage /></ProtectedRoute>} />
        <Route path="/reports/sales-by-customer" element={<ProtectedRoute requiredPermission="reports.sales"><SalesByCustomerReportPage /></ProtectedRoute>} />
        <Route path="/reports/stock-valuation" element={<ProtectedRoute requiredPermission="reports.inventory"><StockValuationReportPage /></ProtectedRoute>} />
        <Route path="/reports/slow-fast-movers" element={<ProtectedRoute requiredPermission="reports.inventory"><SlowFastMoversReportPage /></ProtectedRoute>} />
        <Route path="/reports/inventory/low-stock" element={<ProtectedRoute requiredPermission="reports.inventory"><LowStockReportPage /></ProtectedRoute>} />
        <Route path="/reports/stock-movement" element={<ProtectedRoute requiredPermission="reports.inventory"><StockMovementReportPage /></ProtectedRoute>} />
        <Route path="/reports/daily-stock-status" element={<ProtectedRoute requiredPermission="reports.inventory"><DailyStockStatusReportPage /></ProtectedRoute>} />
        <Route path="/reports/production" element={<ProtectedRoute requiredPermission="reports.production"><ProductionReportPage /></ProtectedRoute>} />
        <Route path="/reports/yield-forecaster" element={<ProtectedRoute requiredPermission="reports.production"><YieldForecasterPage /></ProtectedRoute>} />
        <Route path="/reports/returns-damages" element={<ProtectedRoute requiredPermission="reports.sales"><ReturnsReportPage /></ProtectedRoute>} />
        <Route path="/reports/financial" element={<ProtectedRoute requiredPermission="reports.financial"><FinancialSnapshotPage /></ProtectedRoute>} />
        <Route path="/reports/daily-pnl" element={<ProtectedRoute requiredPermission="reports.financial"><DailyPnLPage /></ProtectedRoute>} />
        <Route path="/reports/variance-comparator" element={<ProtectedRoute requiredPermission="reports.financial"><VarianceComparisonPage /></ProtectedRoute>} />
        <Route path="/reports/hr" element={<ProtectedRoute requiredPermission="reports.hr"><HrReportsPage /></ProtectedRoute>} />
        <Route path="/reports/shift-wise" element={<ProtectedRoute requiredPermission="reports.hr"><ShiftReportingPage /></ProtectedRoute>} />
        <Route path="/reports/predictions" element={<ProtectedRoute requiredPermission="reports.sales"><FuturePredictionsPage /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/users" element={<ProtectedRoute requiredPermission="admin.users.view"><UsersPage /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute requiredPermission="admin.roles.view"><RolesPage /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute requiredPermission="admin.settings"><ImportDataPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiredPermission="admin.settings"><SettingsPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute requiredPermission="view_audit_logs"><AuditLogPage /></ProtectedRoute>} />
        <Route path="/audit-logs/sms" element={<ProtectedRoute requiredPermission="view_audit_logs"><SmsLogsPage /></ProtectedRoute>} />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/gate-screen" element={<GateScreenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;