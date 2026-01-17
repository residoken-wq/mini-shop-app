"use client";

interface ProgressIndicatorProps {
    currentStep: number;
}

const stepLabels = ["Loại khách", "Chọn hàng", "Xác nhận"];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
    return (
        <>
            <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= s
                            ? "bg-purple-500 text-white"
                            : "bg-gray-200 text-gray-500"
                            }`}>
                            {s}
                        </div>
                        {s < 3 && (
                            <div className={`w-12 h-1 ${currentStep > s ? "bg-purple-500" : "bg-gray-200"}`} />
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-8 text-sm text-gray-600">
                {stepLabels.map((label, index) => (
                    <span key={index}>{label}</span>
                ))}
            </div>
        </>
    );
}
