import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { getDashboardStats } from "./actions";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng này</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.thisMonth)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {Number(stats.revenue.change) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {stats.revenue.change}% so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Lợi nhuận tháng này</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.profit.thisMonth)}</div>
            <p className="text-xs text-green-600">
              Biên lợi nhuận: {stats.profit.margin}%
            </p>
            {stats.profit.shippingCost > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Phí ship (shop trả): {formatCurrency(stats.profit.shippingCost)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng hôm nay</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.today}</div>
            <p className="text-xs text-muted-foreground">
              Tổng tháng này: {stats.orders.thisMonth} đơn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products.total}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {stats.products.lowStock > 0 && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              {stats.products.lowStock} sản phẩm sắp hết hàng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.customers.newThisMonth} khách mới tháng này
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Thống kê nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
                <p className="text-xl font-bold">{stats.products.total}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
                <p className="text-xl font-bold">{stats.customers.total}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Đơn hàng tháng này</p>
                <p className="text-xl font-bold">{stats.orders.thisMonth}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sản phẩm cần nhập</p>
                <p className="text-xl font-bold text-yellow-600">{stats.products.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có đơn hàng nào
                </p>
              ) : (
                stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {order.customer?.name || "Khách lẻ"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.code} • {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-green-600">
                      +{formatCurrency(order.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
