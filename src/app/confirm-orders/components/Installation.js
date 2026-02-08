"use client";

import Fabrication from "./Fabrication";

/**
 * Installation component - reuses Fabrication component with different stage configuration
 * When saved, progresses from 'installation' to 'netmeter_apply' stage
 */
export default function Installation({ orderId, orderData, onSuccess }) {
    return (
        <Fabrication
            orderId={orderId}
            orderData={orderData}
            onSuccess={onSuccess}
            currentStage="installation"
            nextStage="netmeter_apply"
            completedAtField="installation_completed_at"
            successMessage="Installation stage completed successfully!"
        />
    );
}
