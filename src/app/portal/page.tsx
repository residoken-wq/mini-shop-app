"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
    CustomerType,
    Customer,
    Promotion,
    OrderResult as OrderResultType,
    OrderFormData,
    BankInfo,
    District,
} from "./types";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { CustomerTypeSelection } from "./components/CustomerTypeSelection";
import { ProductSelection } from "./components/ProductSelection";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { OrderResult } from "./components/OrderResult";
import OrderTracking from "./order-tracking";
import {
    submitPortalOrder,
    getActivePromotions,
    getShopBankInfo,
    getActiveDistrictsForPortal,
} from "./actions";
import { useCart } from "./hooks/useCart";

export default function PortalPage() {
    // Mode: "order" = ordering flow, "track" = order tracking
    const [mode, setMode] = useState<"order" | "track">("order");
    // Step: 1 = Customer Type, 2 = Product Selection, 3 = Confirmation
    const [step, setStep] = useState(1);
    const [customerType, setCustomerType] = useState<CustomerType>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);

    // Promotions
    const [promotions, setPromotions] = useState<Promotion[]>([]);

    // Cart hook
    const {
        cart,
        addToCart,
        updateQuantity,
        setQuantity,
        removeFromCart,
        clearCart,
        updateCartProducts,
        getProductTotal,
        getProductTotalWithPromo,
        getFinalTotal,
        getCartItemPrice,
        getPromotionPrice,
        hasExpiredItems,
    } = useCart({ promotions });

    // Order form state
    const [formData, setFormData] = useState<OrderFormData>({
        recipientName: "",
        recipientPhone: "",
        deliveryAddress: "",
        deliveryMethod: "DELIVERY",
        orderNote: "",
        selectedDistrict: "",
        isOutsideHCMC: false,
        paymentMethod: "COD",
    });
    const [districts, setDistricts] = useState<District[]>([]);
    const [shippingFee, setShippingFee] = useState(0);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [orderResult, setOrderResult] = useState<OrderResultType | null>(null);

    // Load promotions when step 2 is reached - RETAIL ONLY
    useEffect(() => {
        if (step === 2) {
            if (customerType === "retail") {
                getActivePromotions().then((promos) => {
                    setPromotions(promos as Promotion[]);
                });
            } else {
                setPromotions([]);
            }
        }
    }, [step, customerType]);

    // Load bank info and districts when step 3 is reached
    useEffect(() => {
        if (step === 3) {
            getShopBankInfo().then((res) => {
                if (res.success && res.bankInfo) {
                    setBankInfo(res.bankInfo);
                }
            });
            getActiveDistrictsForPortal().then((res) => {
                if (res.success && res.districts) {
                    setDistricts(res.districts);
                }
            });
        }
    }, [step]);

    // Update shipping fee when district changes
    useEffect(() => {
        if (formData.isOutsideHCMC) {
            setShippingFee(0);
        } else if (formData.selectedDistrict) {
            const district = districts.find((d) => d.id === formData.selectedDistrict);
            setShippingFee(district?.shippingFee || 0);
        } else {
            setShippingFee(0);
        }
    }, [formData.selectedDistrict, formData.isOutsideHCMC, districts]);

    // Handlers
    const handleSelectRetail = () => {
        setCustomerType("retail");
        setCustomer(null);
        setStep(2);
    };

    const handleSelectWholesale = (newCustomer: Customer) => {
        setCustomerType("wholesale");
        setCustomer(newCustomer);
        setStep(2);
    };

    const handleFormDataChange = (data: Partial<OrderFormData>) => {
        setFormData((prev) => ({ ...prev, ...data }));
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
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    price: getCartItemPrice(item.product, item.quantity) / item.quantity,
                    unit: item.product.saleUnit || item.product.unit
                })),
                deliveryMethod: formData.deliveryMethod,
                recipientName: formData.recipientName,
                recipientPhone: formData.recipientPhone,
                deliveryAddress: formData.deliveryAddress,
                note: formData.orderNote,
                shippingFee: shippingFee,
                paymentMethod: formData.paymentMethod,
            });
            setOrderResult({
                success: result.success,
                orderCode: result.orderCode,
                total: result.total,
                error: result.error,
                paymentMethod: formData.paymentMethod,
            });
        } catch {
            setOrderResult({ success: false, error: "Có lỗi xảy ra" });
        } finally {
            setIsLoading(false);
        }
    };

    const resetOrder = () => {
        setStep(1);
        setCustomerType(null);
        setCustomer(null);
        clearCart();
        setOrderResult(null);
        setFormData({
            recipientName: "",
            recipientPhone: "",
            deliveryAddress: "",
            deliveryMethod: "DELIVERY",
            orderNote: "",
            selectedDistrict: "",
            isOutsideHCMC: false,
            paymentMethod: "COD",
        });
    };

    return (
        <div className="space-y-6">
            {/* Progress Indicator - Only show in order mode */}
            {mode === "order" && !orderResult?.success && (
                <ProgressIndicator currentStep={step} />
            )}

            {/* Step 1: Customer Type Selection */}
            {mode === "order" && step === 1 && (
                <CustomerTypeSelection
                    onSelectRetail={handleSelectRetail}
                    onSelectWholesale={handleSelectWholesale}
                    onTrackOrder={() => setMode("track")}
                />
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
            {mode === "order" && step === 2 && (
                <ProductSelection
                    customerType={customerType}
                    customer={customer}
                    cart={cart}
                    promotions={promotions}
                    hasExpiredItems={hasExpiredItems}
                    onBack={() => setStep(1)}
                    onConfirm={() => setStep(3)}
                    onAddToCart={addToCart}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setQuantity}
                    onRemoveFromCart={removeFromCart}
                    onUpdateCartProducts={updateCartProducts}
                    getPromotionPrice={getPromotionPrice}
                    getProductTotal={getProductTotal}
                />
            )}

            {/* Step 3: Order Confirmation */}
            {mode === "order" && step === 3 && !orderResult?.success && (
                <OrderConfirmation
                    customerType={customerType}
                    customer={customer}
                    cart={cart}
                    formData={formData}
                    districts={districts}
                    shippingFee={shippingFee}
                    bankInfo={bankInfo}
                    productTotal={getProductTotal()}
                    productTotalWithPromo={getProductTotalWithPromo()}
                    finalTotal={getFinalTotal(shippingFee)}
                    isLoading={isLoading}
                    hasExpiredItems={hasExpiredItems}
                    onBack={() => setStep(2)}
                    onFormDataChange={handleFormDataChange}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setQuantity}
                    onRemoveFromCart={removeFromCart}
                    onSubmit={handleSubmitOrder}
                    getCartItemPrice={getCartItemPrice}
                />
            )}

            {/* Order Result */}
            {orderResult && (
                <OrderResult
                    result={orderResult}
                    bankInfo={bankInfo}
                    onReset={resetOrder}
                />
            )}
        </div>
    );
}
