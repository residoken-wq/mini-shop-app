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
    ArrowLeft
} from "lucide-react";
import { findWholesaleCustomer, getPortalProducts, submitPortalOrder } from "./actions";

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

    const [orderResult, setOrderResult] = useState<{
        success: boolean;
        orderCode?: string;
        total?: number;
        error?: string;
    } | null>(null);

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
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
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
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    price: item.product.displayPrice
                }))
            });

            setOrderResult(result);
            if (result.success) {
                setStep(3);
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
    };

    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
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

            {/* Step 1: Customer Type Selection */}
            {step === 1 && (
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

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {isLoading ? (
                            <div className="col-span-full text-center py-8">Đang tải...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                Không tìm thấy sản phẩm
                            </div>
                        ) : (
                            filteredProducts.map(product => {
                                const cartItem = cart.find(item => item.product.id === product.id);
                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-white rounded-lg shadow p-3 space-y-2 ${product.isExpired ? "opacity-60" : ""
                                            }`}
                                    >
                                        <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center text-3xl">
                                            🥬
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                                            <p className="text-xs text-gray-500">{product.unit}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {product.isExpired ? (
                                                <div className="text-red-500 text-xs flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Hết hạn giá
                                                </div>
                                            ) : (
                                                <span className="font-bold text-purple-600">
                                                    {formatCurrency(product.displayPrice)}đ
                                                </span>
                                            )}
                                        </div>

                                        {product.isExpired ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-red-500"
                                                disabled
                                            >
                                                Liên hệ shop
                                            </Button>
                                        ) : cartItem ? (
                                            <div className="flex items-center justify-between">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(product.id, -1)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="font-medium">{cartItem.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(product.id, 1)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => addToCart(product)}
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Thêm
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

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
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Xác nhận đơn hàng</h2>
                        <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                        </Button>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                        {customerType === "wholesale" ? (
                            <Users className="w-5 h-5 text-purple-600" />
                        ) : (
                            <User className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="font-medium">{customer?.name || "Khách lẻ"}</span>
                        {customerType === "wholesale" && (
                            <Badge className="bg-purple-100 text-purple-800">Sỉ</Badge>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-3">
                        {cart.map(item => (
                            <div
                                key={item.product.id}
                                className="flex items-center gap-4 p-3 border rounded-lg"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-2xl">
                                    🥬
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium">{item.product.name}</h4>
                                    <p className="text-sm text-gray-500">
                                        {formatCurrency(item.product.displayPrice)}đ × {item.quantity}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">
                                        {formatCurrency(item.product.displayPrice * item.quantity)}đ
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 p-0 h-auto"
                                        onClick={() => removeFromCart(item.product.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-medium">Tổng cộng:</span>
                            <span className="font-bold text-xl text-purple-600">
                                {formatCurrency(getCartTotal())}đ
                            </span>
                        </div>
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
