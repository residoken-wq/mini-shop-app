"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ShoppingCart,
    User,
    Users,
    Phone,
    Search,
    Plus,
    Minus,
    Trash2,
    AlertCircle,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Clock,
    FileText,
    CreditCard,
    Banknote,
    QrCode,
    PackageSearch
} from "lucide-react";
import { findWholesaleCustomer, getPortalProducts, submitPortalOrder, getCustomerPendingOrders, getShopBankInfo } from "./actions";
import OrderTracking from "./order-tracking";

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    unit: string;
    stock: number;
    imageUrl: string | null;
    displayPrice: number;
    isExpired: boolean;
    hasWholesalePrice: boolean;
}

interface CartItem {
    product: Product;
    quantity: number;
}

export default function PortalPage() {
    // Mode: "order" = ordering flow, "track" = order tracking
    const [mode, setMode] = useState<"order" | "track">("order");
    // Step: 1 = Customer Type, 2 = Product Selection, 3 = Confirmation
    const [step, setStep] = useState(1);
    const [customerType, setCustomerType] = useState<"retail" | "wholesale" | null>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
    const [phoneError, setPhoneError] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Delivery info
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");

    const [orderResult, setOrderResult] = useState<{
        success: boolean;
        orderCode?: string;
        total?: number;
        error?: string;
        paymentMethod?: string;
    } | null>(null);

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState<"COD" | "QR" | "CREDIT">("COD");
    const [bankInfo, setBankInfo] = useState<{
        bankName: string;
        bankAccount: string;
        bankOwner: string;
    } | null>(null);

    // Pending orders for wholesale customers
    const [pendingOrders, setPendingOrders] = useState<{
        id: string;
        code: string;
        total: number;
        status: string;
        createdAt: Date;
        itemCount: number;
    }[]>([]);

    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPortalProducts(customer?.id);
            setProducts(data);
        } finally {
            setIsLoading(false);
        }
    }, [customer?.id]);

    // Load products when step 2 is reached
    useEffect(() => {
        if (step === 2) {
            loadProducts();
        }
    }, [step, loadProducts]);

    // Load bank info when step 3 is reached
    useEffect(() => {
        if (step === 3) {
            getShopBankInfo().then(res => {
                if (res.success && res.bankInfo) {
                    setBankInfo(res.bankInfo);
                }
            });
        }
    }, [step]);

    const handleSelectRetail = () => {
        setCustomerType("retail");
        setCustomer(null);
        setStep(2);
    };

    const handleSearchWholesale = async () => {
        setPhoneError("");
        if (!phoneNumber.trim()) {
            setPhoneError("Vui lòng nhập số điện thoại");
            return;
        }

        setIsSearching(true);
        try {
            const result = await findWholesaleCustomer(phoneNumber);
            if (result.success && result.customer) {
                setCustomer({ id: result.customer.id, name: result.customer.name });
                setCustomerType("wholesale");

                // Load pending orders for this customer
                const orders = await getCustomerPendingOrders(result.customer.id);
                setPendingOrders(orders);

                setStep(2);
            } else {
                setPhoneError(result.error || "Không tìm thấy khách hàng");
            }
        } finally {
            setIsSearching(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.product.id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { product, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(0, Math.round((item.quantity + delta) * 10) / 10);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const setQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart(cart.filter(item => item.product.id !== productId));
        } else {
            setCart(cart.map(item => {
                if (item.product.id === productId) {
                    return { ...item, quantity: qty };
                }
                return item;
            }));
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const getCartTotal = () => {
        return cart.reduce((sum, item) => sum + (item.product.displayPrice * item.quantity), 0);
    };

    const hasExpiredItems = cart.some(item => item.product.isExpired);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const handleSubmitOrder = async () => {
        if (hasExpiredItems) {
            alert("Có sản phẩm giá đã hết hạn. Vui lòng liên hệ shop.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await submitPortalOrder({
                customerType: customerType!,
                customerId: customer?.id,
                recipientName,
                recipientPhone,
                deliveryAddress,
                paymentMethod,
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    price: item.product.displayPrice
                }))
            });

            if (result.success) {
                setOrderResult(result);
            } else {
                alert(result.error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetOrder = () => {
        setStep(1);
        setCustomerType(null);
        setPhoneNumber("");
        setCustomer(null);
        setCart([]);
        setOrderResult(null);
        setRecipientName("");
        setRecipientPhone("");
        setDeliveryAddress("");
    };

    return (
        <div className="space-y-6">
            {/* Progress Indicator - Only show in order mode */}
            {mode === "order" && (
                <>
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s
                                    ? "bg-purple-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                                    }`}>
                                    {s}
                                </div>
                                {s < 3 && (
                                    <div className={`w-12 h-1 ${step > s ? "bg-purple-500" : "bg-gray-200"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-8 text-sm text-gray-600">
                        <span>Loại khách</span>
                        <span>Chọn hàng</span>
                        <span>Xác nhận</span>
                    </div>
                </>
            )}

            {/* Step 1: Customer Type Selection */}
            {mode === "order" && step === 1 && (
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                    <h2 className="text-xl font-bold text-center">Bạn là?</h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Retail Customer */}
                        <button
                            onClick={handleSelectRetail}
                            className="p-6 border-2 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
                                    <User className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold">Khách Lẻ</h3>
                                    <p className="text-sm text-gray-500">Mua hàng với giá bán lẻ</p>
                                </div>
                            </div>
                        </button>

                        {/* Wholesale Customer */}
                        <div className="p-6 border-2 rounded-xl space-y-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-purple-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold">Khách Sỉ</h3>
                                    <p className="text-sm text-gray-500">Nhập SĐT đã đăng ký</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="tel"
                                            placeholder="Số điện thoại"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="pl-10"
                                            onKeyDown={(e) => e.key === "Enter" && handleSearchWholesale()}
                                        />
                                    </div>
                                    <Button onClick={handleSearchWholesale} disabled={isSearching}>
                                        {isSearching ? "..." : <ArrowRight className="w-4 h-4" />}
                                    </Button>
                                </div>
                                {phoneError && (
                                    <p className="text-red-500 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {phoneError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Tracking Link */}
                    <div className="border-t pt-4">
                        <button
                            onClick={() => setMode("track")}
                            className="w-full p-4 border-2 border-dashed rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center gap-3"
                        >
                            <PackageSearch className="w-6 h-6 text-purple-600" />
                            <span className="font-medium text-gray-700">Tra cứu đơn hàng đã đặt</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Order Tracking Mode */}
            {mode === "track" && (
                <div className="space-y-4">
                    <Button
                        variant="ghost"
                        onClick={() => setMode("order")}
                        className="mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại đặt hàng
                    </Button>
                    <OrderTracking />
                </div>
            )}

            {/* Step 2: Product Selection */}
            {step === 2 && (
                <div className="space-y-4">
                    {/* Customer Info Banner */}
                    <div className="bg-white rounded-lg p-4 shadow flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {customerType === "wholesale" ? (
                                <Users className="w-5 h-5 text-purple-600" />
                            ) : (
                                <User className="w-5 h-5 text-blue-600" />
                            )}
                            <div>
                                <span className="font-medium">
                                    {customer ? customer.name : "Khách lẻ"}
                                </span>
                                {customerType === "wholesale" && (
                                    <Badge className="ml-2 bg-purple-100 text-purple-800">Sỉ</Badge>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Đổi
                        </Button>
                    </div>

                    {/* Pending Orders Section */}
                    {pendingOrders.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <h3 className="font-semibold text-amber-800">
                                    Đơn hàng chưa thanh toán ({pendingOrders.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {pendingOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-sm">{order.code}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(order.createdAt).toLocaleDateString('vi-VN')} • {order.itemCount} sản phẩm
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-amber-600">
                                                {formatCurrency(order.total)}đ
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                {order.status === "PENDING" ? "Chờ xác nhận" : "Đã xác nhận"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>

                    {/* Products Grid - Split into 2 sections */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-500">Đang tải sản phẩm...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Không tìm thấy sản phẩm</p>
                        </div>
                    ) : (
                        <>
                            {/* Section 1: In-stock products */}
                            {(() => {
                                const inStockProducts = filteredProducts
                                    .filter(p => p.stock > 0)
                                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

                                if (inStockProducts.length === 0) return null;

                                return (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 bg-green-50 rounded-lg px-4 py-3 border border-green-200">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <h3 className="font-semibold text-green-800">Sản phẩm còn hàng</h3>
                                            <Badge className="bg-green-500 text-white ml-auto">{inStockProducts.length}</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {inStockProducts.map(product => {
                                                const cartItem = cart.find(item => item.product.id === product.id);
                                                const isDisabled = product.isExpired;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={`
                                                            bg-white rounded-xl shadow-sm border overflow-hidden
                                                            transition-all duration-200 hover:shadow-lg hover:scale-[1.02]
                                                            ${isDisabled ? "opacity-60 grayscale" : ""}
                                                            ${cartItem ? "ring-2 ring-purple-500 ring-offset-2" : ""}
                                                        `}
                                                    >
                                                        {/* Product Image */}
                                                        <div className="aspect-square bg-gradient-to-b from-gray-50 to-gray-100 relative flex items-center justify-center">
                                                            {product.imageUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span className={`text-4xl ${product.imageUrl ? 'hidden' : ''}`}>🥬</span>

                                                            {/* Wholesale Price Indicator */}
                                                            {product.hasWholesalePrice && !product.isExpired && (
                                                                <Badge className="absolute top-2 right-2 bg-purple-500 text-white text-[10px]">
                                                                    Giá sỉ
                                                                </Badge>
                                                            )}

                                                            {/* Cart Quantity Badge */}
                                                            {cartItem && (
                                                                <div className="absolute bottom-2 right-2 bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                                                                    {cartItem.quantity}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="p-3 space-y-2">
                                                            <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>

                                                            <div className="flex items-center justify-between">
                                                                {product.isExpired ? (
                                                                    <div className="text-red-500 text-xs flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        Giá hết hạn
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-bold text-lg text-purple-600">
                                                                            {formatCurrency(product.displayPrice)}đ
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 ml-1">/{product.unit}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            {product.isExpired ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="w-full text-red-500 border-red-200"
                                                                    disabled
                                                                >
                                                                    <AlertCircle className="w-4 h-4 mr-1" />
                                                                    Liên hệ shop
                                                                </Button>
                                                            ) : cartItem ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-full"
                                                                        onClick={() => updateQuantity(product.id, -0.5)}
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </Button>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        value={cartItem.quantity}
                                                                        onChange={(e) => setQuantity(product.id, parseFloat(e.target.value) || 0)}
                                                                        className="h-9 text-center font-medium flex-1"
                                                                    />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-full"
                                                                        onClick={() => updateQuantity(product.id, 0.5)}
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                                                    onClick={() => addToCart(product)}
                                                                >
                                                                    <Plus className="w-4 h-4 mr-1" /> Thêm vào giỏ
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Section 2: Out-of-stock products */}
                            {(() => {
                                const outOfStockProducts = filteredProducts
                                    .filter(p => p.stock <= 0)
                                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

                                if (outOfStockProducts.length === 0) return null;

                                return (
                                    <div className="space-y-4 mt-8">
                                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                            <h3 className="font-semibold text-gray-600">Sản phẩm tạm hết</h3>
                                            <Badge variant="secondary" className="ml-auto">{outOfStockProducts.length}</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {outOfStockProducts.map(product => {
                                                const isDisabled = true;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={`
                                                            bg-white rounded-xl shadow-sm border overflow-hidden
                                                            transition-all duration-200
                                                            opacity-60 grayscale
                                                        `}
                                                    >
                                                        {/* Product Image */}
                                                        <div className="aspect-square bg-gradient-to-b from-gray-50 to-gray-100 relative flex items-center justify-center">
                                                            {product.imageUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <span className={`text-4xl ${product.imageUrl ? 'hidden' : ''}`}>🥬</span>

                                                            {/* Out of Stock Badge */}
                                                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium text-center py-1">
                                                                Hết hàng
                                                            </div>

                                                            {/* Wholesale Price Indicator */}
                                                            {product.hasWholesalePrice && !product.isExpired && (
                                                                <Badge className="absolute top-2 right-2 bg-purple-500 text-white text-[10px]">
                                                                    Giá sỉ
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="p-3 space-y-2">
                                                            <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>

                                                            <div className="flex items-center justify-between">
                                                                {product.isExpired ? (
                                                                    <div className="text-red-500 text-xs flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        Giá hết hạn
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-bold text-lg text-gray-400">
                                                                            {formatCurrency(product.displayPrice)}đ
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 ml-1">/{product.unit}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions - Disabled */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full text-gray-400 border-gray-200"
                                                                disabled
                                                            >
                                                                Hết hàng
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}

                    {/* Cart Summary */}
                    {cart.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
                            <div className="max-w-4xl mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <ShoppingCart className="w-6 h-6" />
                                        <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{cart.length} sản phẩm</p>
                                        <p className="font-bold text-lg">{formatCurrency(getCartTotal())}đ</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setStep(3)}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                                    disabled={hasExpiredItems}
                                >
                                    Xác nhận đơn
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Spacer for fixed cart */}
                    {cart.length > 0 && <div className="h-24" />}
                </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && !orderResult?.success && (
                <div className="space-y-4">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Xác nhận đơn hàng</h2>
                                <p className="text-white/80 text-sm mt-1">
                                    Kiểm tra thông tin và gửi đơn hàng
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep(2)}
                                className="text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                            </Button>
                        </div>

                        {/* Customer Badge */}
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                            {customerType === "wholesale" ? (
                                <Users className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            <span className="font-medium">{customer?.name || "Khách lẻ"}</span>
                            {customerType === "wholesale" && (
                                <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full">Giá sỉ</span>
                            )}
                        </div>
                    </div>

                    {/* Delivery Info Form */}
                    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <ArrowRight className="w-4 h-4 text-purple-600 rotate-90" />
                            </div>
                            <h3 className="font-semibold">Thông tin giao hàng</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Tên người nhận *
                                </label>
                                <Input
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    placeholder="Nhập tên người nhận hàng"
                                    className="h-11 border-gray-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> Số điện thoại *
                                </label>
                                <Input
                                    type="tel"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    placeholder="Nhập số điện thoại giao hàng"
                                    className="h-11 border-gray-200"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                📍 Địa chỉ giao hàng *
                            </label>
                            <Input
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                                className="h-11 border-gray-200"
                            />
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-700">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <ShoppingCart className="w-4 h-4 text-green-600" />
                                </div>
                                <h3 className="font-semibold">Sản phẩm ({cart.length})</h3>
                            </div>
                            <span className="text-sm text-gray-500">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)} đơn vị
                            </span>
                        </div>

                        <div className="space-y-3">
                            {cart.map(item => (
                                <div
                                    key={item.product.id}
                                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
                                >
                                    {/* Top row: Image + Name + Delete */}
                                    <div className="flex items-start gap-3">
                                        {/* Product Image */}
                                        <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            {item.product.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.product.imageUrl}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl">🥬</span>
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 text-sm leading-tight">{item.product.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {formatCurrency(item.product.displayPrice)}đ/{item.product.unit}
                                            </p>
                                        </div>

                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                            onClick={() => removeFromCart(item.product.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Bottom row: Quantity + Price */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-1 bg-white rounded-full border p-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-gray-100"
                                                onClick={() => updateQuantity(item.product.id, -0.5)}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) => setQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                                                className="w-16 text-center h-8 border-0 px-1 bg-transparent font-bold text-base"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-gray-100"
                                                onClick={() => updateQuantity(item.product.id, 0.5)}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Total Price */}
                                        <p className="font-bold text-lg text-purple-600">
                                            {formatCurrency(item.product.displayPrice * item.quantity)}đ
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total & Submit */}
                    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex justify-between items-center py-3 border-b">
                            <span className="text-gray-600">Tổng sản phẩm</span>
                            <span className="font-medium">{cart.length} loại</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                            <span className="text-gray-600">Tổng số lượng</span>
                            <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)} đơn vị</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-semibold">Tổng cộng</span>
                            <span className="text-2xl font-bold text-purple-600">
                                {formatCurrency(getCartTotal())}đ
                            </span>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="font-semibold">Phương thức thanh toán</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {/* COD Option */}
                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${paymentMethod === "COD"
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                                onClick={() => setPaymentMethod("COD")}
                            >
                                <Banknote className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "COD" ? "text-green-600" : "text-gray-400"}`} />
                                <p className="font-medium text-sm">Tiền mặt</p>
                                <p className="text-xs text-gray-500">COD</p>
                            </div>

                            {/* QR Transfer Option */}
                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${paymentMethod === "QR"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                                onClick={() => setPaymentMethod("QR")}
                            >
                                <QrCode className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "QR" ? "text-blue-600" : "text-gray-400"}`} />
                                <p className="font-medium text-sm">Chuyển khoản</p>
                                <p className="text-xs text-gray-500">QR Code</p>
                            </div>

                            {/* Credit Option - Only for wholesale */}
                            <div
                                className={`p-4 rounded-xl border-2 transition-all text-center ${customerType !== "wholesale"
                                    ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                    : paymentMethod === "CREDIT"
                                        ? "border-purple-500 bg-purple-50 cursor-pointer"
                                        : "border-gray-200 hover:border-gray-300 cursor-pointer"
                                    }`}
                                onClick={() => customerType === "wholesale" && setPaymentMethod("CREDIT")}
                            >
                                <FileText className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "CREDIT" ? "text-purple-600" : "text-gray-400"}`} />
                                <p className="font-medium text-sm">Công nợ</p>
                                <p className="text-xs text-gray-500">{customerType === "wholesale" ? "Khách sỉ" : "Chỉ sỉ"}</p>
                            </div>
                        </div>

                        {/* QR Code Display */}
                        {paymentMethod === "QR" && bankInfo && bankInfo.bankAccount && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-blue-700 mb-3">Quét mã để chuyển khoản</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`https://img.vietqr.io/image/${bankInfo.bankName}-${bankInfo.bankAccount}-compact2.png?amount=${getCartTotal()}&addInfo=${encodeURIComponent(`Thanh toan don hang`)}&accountName=${encodeURIComponent(bankInfo.bankOwner)}`}
                                        alt="QR Code"
                                        className="w-48 h-48 mx-auto rounded-lg border shadow-sm bg-white"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                                        <p><strong>Ngân hàng:</strong> {bankInfo.bankName}</p>
                                        <p><strong>Số TK:</strong> {bankInfo.bankAccount}</p>
                                        <p><strong>Chủ TK:</strong> {bankInfo.bankOwner}</p>
                                        <p className="text-purple-600 font-bold">Số tiền: {formatCurrency(getCartTotal())}đ</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === "QR" && (!bankInfo || !bankInfo.bankAccount) && (
                            <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
                                <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                                <p className="text-sm text-yellow-700">Cửa hàng chưa cấu hình thông tin ngân hàng</p>
                            </div>
                        )}

                        {paymentMethod === "CREDIT" && (
                            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
                                <p className="text-sm text-purple-700">
                                    💳 Đơn hàng sẽ được ghi vào công nợ của khách hàng <strong>{customer?.name}</strong>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmitOrder}
                        disabled={isLoading || cart.length === 0}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-6 text-lg"
                    >
                        {isLoading ? "Đang xử lý..." : "Gửi đơn hàng"}
                    </Button>
                </div>
            )}

            {/* Order Success */}
            {step === 3 && orderResult?.success && (
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 text-center">
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-green-600">Đặt hàng thành công!</h2>
                        <p className="text-gray-600 mt-2">Cảm ơn bạn đã đặt hàng</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <p className="text-sm text-gray-600">Mã đơn hàng</p>
                        <p className="text-2xl font-bold text-purple-600">{orderResult.orderCode}</p>
                        <p className="text-lg">Tổng: <strong>{formatCurrency(orderResult.total || 0)}đ</strong></p>
                    </div>

                    <p className="text-sm text-gray-500">
                        Chúng tôi sẽ liên hệ bạn để xác nhận đơn hàng
                    </p>

                    <Button onClick={resetOrder} variant="outline" className="mt-4">
                        Đặt đơn mới
                    </Button>
                </div>
            )}
        </div>
    );
}
