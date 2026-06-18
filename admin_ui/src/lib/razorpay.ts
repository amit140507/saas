declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
        };
    }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export async function ensureRazorpayLoaded(): Promise<boolean> {
    if (typeof window === "undefined") {
        return false;
    }

    if (window.Razorpay) {
        return true;
    }

    if (!razorpayScriptPromise) {
        razorpayScriptPromise = new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }

    return razorpayScriptPromise;
}
