"use client";

import { useState, useEffect } from "react";
import { Promotion } from "../types";
import { getActivePromotions } from "../actions";

interface UsePromotionsReturn {
    promotions: Promotion[];
    isLoading: boolean;
    loadPromotions: () => Promise<void>;
}

export function usePromotions(): UsePromotionsReturn {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadPromotions = async () => {
        setIsLoading(true);
        try {
            const promos = await getActivePromotions();
            setPromotions(promos as Promotion[]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        promotions,
        isLoading,
        loadPromotions,
    };
}
