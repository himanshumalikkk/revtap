import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import type { OrderRecord } from '../types';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const [passkey, setPasskey] = useState('revtap_admin_2026');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchOrders = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        throw new Error('Invalid admin passkey or unauthorized.');
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(passkey);
  };

  const handleSyncToSheets = async (orderId: string) => {
    setSyncingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/sync-sheet?key=${encodeURIComponent(passkey)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Google Sheets Sync notice: ${data.message || data.error}`);
      } else {
        alert(`Successfully synced order ${orderId} to Google Sheet!`);
      }
      // Refresh
      fetchOrders(passkey);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  // Export filtered orders as CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      'Order ID',
      'Created At',
      'Status',
      'Package',
      'Signs',
      'Total',
      'Business Name',
      'Email',
      'Phone',
      'City',
      'State',
      'ZIP',
      'Google Review URL',
      'Synced to Sheet',
    ];

    const rows = orders.map((o) => [
      o.id,
      o.createdAt,
      o.status,
      o.packageName,
      o.quantity,
      `$${o.total}`,
      `"${o.business.businessName.replace(/"/g, '""')}"`,
      o.business.businessEmail,
      o.business.businessPhone || '',
      o.shipping.city,
      o.shipping.state,
      o.shipping.zipCode,
      `"${o.business.googleReviewUrl.replace(/"/g, '""')}"`,
      o.syncedToGoogleSheets ? 'Yes' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revtap_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    const term = searchFilter.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      o.business.businessName.toLowerCase().includes(term) ||
      o.business.businessEmail.toLowerCase().includes(term) ||
      o.shipping.city.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-950">
                RevTap Merchant Fulfillment & Sheets Portal
              </h3>
              <p className="text-xs text-zinc-500">
                Internal dashboard to monitor PayPal orders and sync to supplier reorder sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAuthenticated ? (
          <div className="py-12 max-w-sm mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-zinc-950">Store Admin Passkey</h4>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Enter the admin passkey from your environment configuration.
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter passkey"
                className="w-full px-4 py-2 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                {loading ? 'Verifying...' : 'Access Order Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Business, or City..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(passkey)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-100 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No orders found matching your search.
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Order ID / Date</th>
                      <th className="py-3 px-4">Business & Contact</th>
                      <th className="py-3 px-4">Pack & Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Google Sheet Sync</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-zinc-950 block">
                            {o.id}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-900 block">
                            {o.business.businessName}
                          </span>
                          <span className="text-zinc-500 text-[11px]">
                            {o.shipping.fullName} • {o.business.businessEmail}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-900 block">
                            {o.packageName}
                          </span>
                          <span className="text-zinc-500 text-[11px]">
                            ${o.total.toFixed(2)} USD
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              o.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'payment_pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {o.syncedToGoogleSheets ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-[11px]">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <a
                            href={o.business.googleReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded"
                            title="Verify Review URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleSyncToSheets(o.id)}
                            disabled={syncingId === o.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-bold text-zinc-800 transition-colors"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${syncingId === o.id ? 'animate-spin' : ''}`}
                            />
                            <span>Sync Sheet</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
