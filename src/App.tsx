import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import WarehouseMap from './pages/WarehouseMap';
import InventoryManagement from './pages/InventoryManagement';
import BatchManagement from './pages/BatchManagement';
import StockMovement from './pages/StockMovement';
import InboundReceiving from './pages/InboundReceiving';
import PickingOrders from './pages/PickingOrders';
import CustomsDocumentation from './pages/CustomsDocumentation';
import ReportsAnalytics from './pages/ReportsAnalytics';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import SupplierManagement from './pages/SupplierManagement';
import WarehouseLineManagement from './pages/WarehouseLineManagement';
import BarangLini1 from './pages/BarangLini1';
import DashboardGudang from './pages/DashboardGudang';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard-gudang"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Dashboard Gudang
              </Link>
              <Link
                to="/warehouses"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Gudang
              </Link>
              <Link
                to="/stock-in"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Barang Masuk
              </Link>
              <Link
                to="/stock-out"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Barang Keluar
              </Link>
              <Link
                to="/barang-lini1"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Barang Lini 1
              </Link>
              <Link
                to="/warehouse-line"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Lini 1 & 2
              </Link>
              <Link
                to="/batch"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Batch
              </Link>
              <Link
                to="/customs"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Customs
              </Link>
              <Link
                to="/reports"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Laporan
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Peta Gudang
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard-gudang" element={<DashboardGudang />} />
        <Route path="/warehouses" element={<WarehouseDashboard />} />
        <Route path="/suppliers" element={<SupplierManagement />} />
        <Route path="/stock-in" element={<StockIn />} />
        <Route path="/stock-out" element={<StockOut />} />
        <Route path="/barang-lini1" element={<BarangLini1 />} />
        <Route path="/warehouse-line" element={<WarehouseLineManagement />} />
        <Route path="/batch" element={<BatchManagement />} />
        <Route path="/customs" element={<CustomsDocumentation />} />
        <Route path="/reports" element={<ReportsAnalytics />} />
        <Route path="/map" element={<WarehouseMap />} />
      </Routes>
    </div>
  );
}

export default App;