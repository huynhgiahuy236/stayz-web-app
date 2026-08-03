"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Hotel as HotelIcon,
  Calendar,
  Users,
  FileText,
  Loader2,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  getAllBookingsAdmin,
  getAllUsersAdmin,
  getAdminAuditLogs,
  getAllHotels,
  deletePropertyAdmin,
} from "@/lib/api";
import type { Booking, Hotel, User } from "@/lib/types";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}

function getStoredUser(): User | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_user="));
    if (!m) return null;
    return JSON.parse(decodeURIComponent(m.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

type Tab = "overview" | "bookings" | "properties" | "users" | "audit";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Hotel[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [searchCode, setSearchCode] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const currentUser = getStoredUser();
    if (!token || currentUser?.role !== "admin") {
      // Direct unauthorized user to login
      router.replace("/login?redirect=/admin");
      return;
    }

    Promise.all([
      getAllBookingsAdmin(token),
      getAllUsersAdmin(token),
      getAllHotels(),
      getAdminAuditLogs(token),
    ]).then(([bData, uData, pData, aData]) => {
      setBookings(bData);
      setUsers(uData);
      setProperties(pData);
      setAuditLogs(aData);
      setLoading(false);
    });
  }, []);

  async function handleDeleteProperty(id: string) {
    if (!confirm("Bạn có chắc muốn xóa khách sạn này không?")) return;
    const token = getToken();
    if (!token) return;
    setDeletingId(id);
    const { error } = await deletePropertyAdmin(token, id);
    setDeletingId(null);
    if (!error) {
      setProperties((prev) => prev.filter((p) => p._id !== id));
    } else {
      alert(error);
    }
  }

  const totalRevenue = bookings
    .filter((b) => b.payment_status === "paid" || b.status === "completed")
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const filteredBookings = searchCode.trim()
    ? bookings.filter((b) =>
        b.check_in_code?.toLowerCase().includes(searchCode.toLowerCase().trim()) ||
        (typeof b.user_id === "object" && (b.user_id as User).email.toLowerCase().includes(searchCode.toLowerCase().trim())) ||
        (typeof b.property_id === "object" && (b.property_id as Hotel).title.toLowerCase().includes(searchCode.toLowerCase().trim()))
      )
    : bookings;

  if (loading) {
    return (
      <main id="main-content" style={{ background: "var(--color-bg)", minHeight: "100dvh" }}>
        <SiteHeader />
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}>
          <Loader2 size={36} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" style={{ background: "var(--color-bg)", minHeight: "100dvh" }}>
      <SiteHeader />

      {/* Hero Header */}
      <section style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "var(--sp-12) 0" }}>
        <div className="shell">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-2)" }}>
            <ShieldAlert size={28} style={{ color: "var(--gold)" }} aria-hidden="true" />
            <p className="eyebrow" style={{ color: "var(--gold)", margin: 0 }}>StayZ Administration</p>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, margin: 0 }}>
            Trang Quản trị Hệ thống
          </h1>
        </div>
      </section>

      <div className="shell" style={{ paddingTop: "var(--sp-8)", paddingBottom: "var(--sp-24)" }}>
        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "var(--sp-2)", borderBottom: "2px solid var(--color-border)", marginBottom: "var(--sp-8)", overflowX: "auto" }}>
          {[
            { id: "overview", label: "Tổng quan", icon: Clock },
            { id: "bookings", label: `Đặt phòng (${bookings.length})`, icon: Calendar },
            { id: "properties", label: `Khách sạn (${properties.length})`, icon: HotelIcon },
            { id: "users", label: `Người dùng (${users.length})`, icon: Users },
            { id: "audit", label: `Audit Log (${auditLogs.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--navy)" : "var(--color-ink-3)",
                  background: "transparent",
                  border: 0,
                  borderBottom: isActive ? "3px solid var(--navy)" : "3px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  marginBottom: -2,
                }}
              >
                <Icon size={16} aria-hidden="true" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--sp-5)", marginBottom: "var(--sp-10)" }}>
              <div className="profile-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-ink-3)", fontWeight: 600 }}>TỔNG DOANH THU</span>
                  <DollarSign size={20} style={{ color: "var(--gold)" }} />
                </div>
                <strong style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--navy)", display: "block", marginTop: 8 }}>
                  {fmtPrice(totalRevenue)}
                </strong>
              </div>

              <div className="profile-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-ink-3)", fontWeight: 600 }}>TỔNG ĐẶT PHÒNG</span>
                  <Calendar size={20} style={{ color: "var(--navy)" }} />
                </div>
                <strong style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--color-ink)", display: "block", marginTop: 8 }}>
                  {bookings.length}
                </strong>
              </div>

              <div className="profile-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-ink-3)", fontWeight: 600 }}>KHÁCH SẠN</span>
                  <HotelIcon size={20} style={{ color: "var(--navy)" }} />
                </div>
                <strong style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--color-ink)", display: "block", marginTop: 8 }}>
                  {properties.length}
                </strong>
              </div>

              <div className="profile-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-ink-3)", fontWeight: 600 }}>NGƯỜI DÙNG</span>
                  <Users size={20} style={{ color: "var(--navy)" }} />
                </div>
                <strong style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--color-ink)", display: "block", marginTop: 8 }}>
                  {users.length}
                </strong>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="profile-card">
              <h2 style={{ marginBottom: "var(--sp-4)" }}>Đơn đặt phòng gần đây</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-ink-3)" }}>
                      <th style={{ padding: 12 }}>Mã / ID</th>
                      <th style={{ padding: 12 }}>Khách sạn</th>
                      <th style={{ padding: 12 }}>Ngày lưu trú</th>
                      <th style={{ padding: 12 }}>Tổng tiền</th>
                      <th style={{ padding: 12 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map((b) => {
                      const hotel = typeof b.property_id === "object" ? (b.property_id as Hotel) : null;
                      return (
                        <tr key={b._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: 12, fontWeight: 700 }}>{b.check_in_code ?? b._id.slice(-6)}</td>
                          <td style={{ padding: 12 }}>{hotel?.title ?? "—"}</td>
                          <td style={{ padding: 12 }}>{fmtDate(b.check_in).slice(0, 10)}</td>
                          <td style={{ padding: 12, fontWeight: 700 }}>{fmtPrice(b.total_price)}</td>
                          <td style={{ padding: 12 }}>
                            <span className={`booking-status-badge ${b.status}`}>{b.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bookings */}
        {activeTab === "bookings" && (
          <div className="profile-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-6)", flexWrap: "wrap", gap: 16 }}>
              <h2>Tất cả đơn đặt phòng ({bookings.length})</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--r-md)", padding: "6px 12px", width: 280 }}>
                <Search size={16} style={{ color: "var(--color-ink-3)" }} />
                <input
                  type="text"
                  placeholder="Mã check-in, email, hotel..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  style={{ border: 0, outline: 0, background: "transparent", fontSize: 13, width: "100%" }}
                />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-ink-3)" }}>
                    <th style={{ padding: 12 }}>Mã Code</th>
                    <th style={{ padding: 12 }}>Khách hàng</th>
                    <th style={{ padding: 12 }}>Khách sạn</th>
                    <th style={{ padding: 12 }}>Check-in / Check-out</th>
                    <th style={{ padding: 12 }}>Tổng tiền</th>
                    <th style={{ padding: 12 }}>Thanh toán</th>
                    <th style={{ padding: 12 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => {
                    const hotel = typeof b.property_id === "object" ? (b.property_id as Hotel) : null;
                    const user = typeof b.user_id === "object" ? (b.user_id as User) : null;
                    return (
                      <tr key={b._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: 12, fontWeight: 700, color: "var(--navy)" }}>{b.check_in_code || b._id.slice(-6)}</td>
                        <td style={{ padding: 12 }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{user?.full_name || "—"}</p>
                          <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-3)" }}>{user?.email}</p>
                        </td>
                        <td style={{ padding: 12 }}>{hotel?.title || "—"}</td>
                        <td style={{ padding: 12, fontSize: 13 }}>
                          {fmtDate(b.check_in).slice(0, 10)} → {fmtDate(b.check_out).slice(0, 10)}
                        </td>
                        <td style={{ padding: 12, fontWeight: 700 }}>{fmtPrice(b.total_price)}</td>
                        <td style={{ padding: 12, fontSize: 13 }}>
                          <span style={{ color: b.payment_status === "paid" ? "var(--color-success)" : "var(--color-ink-3)", fontWeight: 600 }}>
                            {b.payment_status}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span className={`booking-status-badge ${b.status}`}>{b.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Properties */}
        {activeTab === "properties" && (
          <div className="profile-card">
            <h2 style={{ marginBottom: "var(--sp-6)" }}>Danh sách khách sạn hệ thống ({properties.length})</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-ink-3)" }}>
                    <th style={{ padding: 12 }}>Tên khách sạn</th>
                    <th style={{ padding: 12 }}>Thành phố</th>
                    <th style={{ padding: 12 }}>Loại hình</th>
                    <th style={{ padding: 12 }}>Giá từ</th>
                    <th style={{ padding: 12 }}>Đánh giá</th>
                    <th style={{ padding: 12 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: 12, fontWeight: 700 }}>
                        <Link href={`/hotels/${encodeURIComponent(p.city.toLowerCase().replace(/\s+/g, "-"))}/${p.slug}`} style={{ color: "var(--navy)" }}>
                          {p.title}
                        </Link>
                      </td>
                      <td style={{ padding: 12 }}>{p.city}</td>
                      <td style={{ padding: 12, textTransform: "capitalize" }}>{p.type || "Nơi lưu trú"}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{p.min_price || p.base_price ? fmtPrice(p.min_price || p.base_price!) : "—"}</td>
                      <td style={{ padding: 12 }}>★ {p.rating?.toFixed(1) || "Mới"} ({p.review_count || 0})</td>
                      <td style={{ padding: 12 }}>
                        <button
                          onClick={() => handleDeleteProperty(p._id)}
                          disabled={deletingId === p._id}
                          style={{ border: 0, background: "none", color: "var(--color-destructive)", cursor: "pointer" }}
                          aria-label={`Xóa ${p.title}`}
                        >
                          {deletingId === p._id ? <Loader2 size={16} style={{ animation: "spin .7s linear infinite" }} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Users */}
        {activeTab === "users" && (
          <div className="profile-card">
            <h2 style={{ marginBottom: "var(--sp-6)" }}>Danh sách người dùng ({users.length})</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-ink-3)" }}>
                    <th style={{ padding: 12 }}>Họ và tên</th>
                    <th style={{ padding: 12 }}>Email</th>
                    <th style={{ padding: 12 }}>Số điện thoại</th>
                    <th style={{ padding: 12 }}>Vai trò</th>
                    <th style={{ padding: 12 }}>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{u.full_name || "Chưa cập nhật"}</td>
                      <td style={{ padding: 12 }}>{u.email}</td>
                      <td style={{ padding: 12 }}>{u.phone_number || "—"}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: u.role === "admin" ? "var(--gold-pale)" : "var(--color-muted)", color: u.role === "admin" ? "var(--gold)" : "var(--color-ink-2)" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === "audit" && (
          <div className="profile-card">
            <h2 style={{ marginBottom: "var(--sp-6)" }}>Nhật ký Quản trị (Admin Audit Logs)</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-ink-3)" }}>
                    <th style={{ padding: 12 }}>Thời gian</th>
                    <th style={{ padding: 12 }}>Hành động</th>
                    <th style={{ padding: 12 }}>Admin Executed</th>
                    <th style={{ padding: 12 }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--color-ink-3)" }}>
                        Chưa có ghi nhận nhật ký nào.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: 12 }}>{fmtDate(log.createdAt)}</td>
                        <td style={{ padding: 12, fontWeight: 600, color: "var(--navy)" }}>{log.action}</td>
                        <td style={{ padding: 12 }}>{log.admin_id?.email || log.admin_id || "System"}</td>
                        <td style={{ padding: 12, fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(log.details || {})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
