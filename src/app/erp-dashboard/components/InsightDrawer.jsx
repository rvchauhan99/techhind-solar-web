import React from "react";
import {
    IconX,
    IconUser,
    IconMapPin,
    IconBolt,
    IconCurrencyRupee,
    IconCheck,
    IconClock,
    IconFileText
} from "@tabler/icons-react";

export default function InsightDrawer({ open, onClose, order }) {
    // Simple stepper stages based on the order model
    const stepperStages = [
        { label: "Estimate", status: "completed", date: "12 Oct 2023" },
        { label: "Planner & Allocation", status: "completed", date: "15 Oct 2023" },
        { label: "Delivery", status: "completed", date: "18 Oct 2023" },
        { label: "Fabrication", status: "current", date: "In Progress" },
        { label: "Installation", status: "pending", date: "-" },
        { label: "Netmeter", status: "pending", date: "-" },
        { label: "Subsidy", status: "pending", date: "-" },
    ];

    if (!open) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Right Side Drawer */}
            <div className={`fixed inset-y-0 right-0 w-[420px] max-w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-slate-200`}>

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{order?.id || "ORDER-DETAILS"}</h2>
                        <p className="text-sm text-slate-500">{order?.stage || "Current Stage"}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <IconUser className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Customer</p>
                                <p className="text-sm font-semibold text-slate-800 line-clamp-2">{order?.customer || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                                <IconBolt className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Capacity</p>
                                <p className="text-sm font-semibold text-slate-800">{order?.capacity || "0 kW"}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                                <IconMapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Branch/Site</p>
                                <p className="text-sm font-semibold text-slate-800">{order?.branch || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg shrink-0">
                                <IconCurrencyRupee className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Project Value</p>
                                <p className="text-sm font-semibold text-slate-800">{order?.cost || "₹0"}</p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Vertical Stepper Timeline */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-5">Order Timeline</h3>
                        <div className="pl-2 space-y-0 relative">
                            {/* Connecting Line */}
                            <div className="absolute top-2 left-[15px] bottom-6 w-0.5 bg-slate-100"></div>

                            {stepperStages.map((step, idx) => (
                                <div key={idx} className="relative flex items-start gap-4 pb-6 group">
                                    {/* Step Indicator */}
                                    <div className={`relative z-10 flex text-white shrink-0 items-center justify-center w-[18px] h-[18px] rounded-full mt-0.5 ring-4 ring-white ${step.status === 'completed' ? 'bg-emerald-500' :
                                            step.status === 'current' ? 'bg-blue-600' : 'bg-slate-200'
                                        }`}>
                                        {step.status === 'completed' && <IconCheck className="w-3 h-3" stroke={3} />}
                                        {step.status === 'current' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>

                                    {/* Step Content */}
                                    <div>
                                        <h4 className={`text-sm font-semibold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-800'
                                            }`}>
                                            {step.label}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                                            {step.status === 'current' ? (
                                                <IconClock className="w-3 h-3 text-blue-500" />
                                            ) : null}
                                            <span>{step.date}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Document Section Placeholder */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                            Documents
                            <button className="text-xs text-blue-600 hover:underline">View All</button>
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="p-2 bg-slate-100 text-slate-500 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <IconFileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Electricity Bill.pdf</p>
                                    <p className="text-xs text-slate-400">Uploaded 12 Oct • 2.4 MB</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="p-2 bg-slate-100 text-slate-500 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <IconFileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Aadhar Card.jpg</p>
                                    <p className="text-xs text-slate-400">Uploaded 12 Oct • 1.1 MB</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-3">
                    <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                        Edit Details
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 hover:shadow transition-all">
                        Update Stage
                    </button>
                </div>

            </div>
        </>
    );
}
