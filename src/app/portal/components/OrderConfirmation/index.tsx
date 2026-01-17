"use client";

import { useEffect } from "react";
import { ArrowLeft, User, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    CartItem,
    Product,
    CustomerType,
    Customer,
    District,
    BankInfo,
    OrderFormData,
} from "../../types";
import { DeliveryMethodCard } from "./DeliveryMethodCard";
import { AddressForm } from "./AddressForm";
import { CartItemList } from "./CartItemList";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodSelector } from "./PaymentMethodSelector";

interface OrderConfirmationProps {
    customerType: CustomerType;
    customer: Customer | null;
    cart: CartItem[];
    formData: OrderFormData;
    districts: District[];
    shippingFee: number;
    bankInfo: BankInfo | null;
    productTotal: number;
    productTotalWithPromo: number;
    finalTotal: number;
    isLoading: boolean;
    hasExpiredItems: boolean;
    onBack: () => void;
    onFormDataChange: (data: Partial<OrderFormData>) => void;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onSetQuantity: (productId: string, qty: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onSubmit: () => void;
    getCartItemPrice: (product: Product, quantity: number) => number;
}

export function OrderConfirmation({
    customerType,
    customer,
    cart,
    formData,
    districts,
    shippingFee,
    bankInfo,
    productTotal,
    productTotalWithPromo,
    finalTotal,
    isLoading,
    hasExpiredItems,
    onBack,
    onFormDataChange,
    onUpdateQuantity,
    onSetQuantity,
    onRemoveFromCart,
    onSubmit,
    getCartItemPrice,
}: OrderConfirmationProps) {
    return (
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
                        onClick={onBack}
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

            {/* Delivery Method */}
            <DeliveryMethodCard
                deliveryMethod={formData.deliveryMethod}
                onMethodChange={(method) => onFormDataChange({ deliveryMethod: method })}
            />

            {/* Address Form (only for delivery) */}
            {formData.deliveryMethod === "DELIVERY" && (
                <AddressForm
                    recipientName={formData.recipientName}
                    recipientPhone={formData.recipientPhone}
                    deliveryAddress={formData.deliveryAddress}
                    selectedDistrict={formData.selectedDistrict}
                    isOutsideHCMC={formData.isOutsideHCMC}
                    orderNote={formData.orderNote}
                    districts={districts}
                    onRecipientNameChange={(v) => onFormDataChange({ recipientName: v })}
                    onRecipientPhoneChange={(v) => onFormDataChange({ recipientPhone: v })}
                    onDeliveryAddressChange={(v) => onFormDataChange({ deliveryAddress: v })}
                    onDistrictChange={(v) => onFormDataChange({ selectedDistrict: v })}
                    onOutsideHCMCChange={(v) => onFormDataChange({ isOutsideHCMC: v })}
                    onOrderNoteChange={(v) => onFormDataChange({ orderNote: v })}
                />
            )}

            {/* Cart Item List */}
            <CartItemList
                cart={cart}
                getCartItemPrice={getCartItemPrice}
                onUpdateQuantity={onUpdateQuantity}
                onSetQuantity={onSetQuantity}
                onRemove={onRemoveFromCart}
            />

            {/* Order Summary */}
            <OrderSummary
                cart={cart}
                productTotal={productTotal}
                productTotalWithPromo={productTotalWithPromo}
                shippingFee={shippingFee}
                finalTotal={finalTotal}
            />

            {/* Payment Method */}
            <PaymentMethodSelector
                paymentMethod={formData.paymentMethod}
                customerType={customerType}
                bankInfo={bankInfo}
                onPaymentMethodChange={(method) => onFormDataChange({ paymentMethod: method })}
            />

            {/* Submit Order Button */}
            <Button
                onClick={onSubmit}
                disabled={isLoading || hasExpiredItems || cart.length === 0}
                className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg font-bold rounded-xl shadow-lg"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Đang xử lý...
                    </>
                ) : (
                    "Gửi đơn hàng"
                )}
            </Button>
        </div>
    );
}
