import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { Truck, Package, Shield, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import io from 'socket.io-client';
import { getBackendUrl } from '../api/config';

export default function GateScreenPage() {
    const [gp, setGp]           = useState(null);
    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [flash, setFlash]     = useState(false);

    const fetchScreen = async () => {
        try {
            const { data } = await api.get('/gate-passes/screen');
            setGp(data.data);
            setLastUpdate(new Date());
        } catch { /* silent */ }
    };

    const triggerFlash = () => {
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
    };

    useEffect(() => {
        fetchScreen();
        // Polling fallback every 30s
        const poll = setInterval(fetchScreen, 30000);

        // Socket.IO primary channel
        const socket = io(getBackendUrl(), { withCredentials: true });
        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('gate_pass_approved', (data) => {
            setGp(data);
            setLastUpdate(new Date());
            triggerFlash();
        });
        socket.on('gate_pass_exited', () => {
            fetchScreen();
        });

        return () => { socket.disconnect(); clearInterval(poll); };
    }, []);

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-700 ${
            flash ? 'bg-emerald-600' : 'bg-gray-950'
        }`}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Shield size={28} className="text-emerald-400" />
                    <div>
                        <p className="text-white font-black text-lg tracking-wide">GATE CONTROL</p>
                        <p className="text-white/40 text-xs">Export Lanka — Sooriyawewa</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        connected ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {connected ? 'LIVE' : 'OFFLINE'}
                    </div>
                    <button onClick={fetchScreen} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                        <RefreshCw size={16} className="text-white/60" />
                    </button>
                    <p className="text-white/40 text-sm font-mono">
                        {new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-8">
                {!gp ? (
                    <div className="text-center">
                        <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                            <Truck size={56} className="text-white/20" />
                        </div>
                        <p className="text-white/40 text-xl font-bold">NO PENDING GATE PASSES</p>
                        <p className="text-white/20 text-sm mt-2">Waiting for authorised vehicle...</p>
                    </div>
                ) : (
                    <div className="w-full max-w-3xl">
                        {/* GP Number + Status */}
                        <div className="text-center mb-8">
                            <div className="inline-block bg-emerald-500/20 border border-emerald-500/40 rounded-2xl px-8 py-3 mb-4">
                                <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase">APPROVED — AUTHORISED TO PROCEED</p>
                            </div>
                            <h1 className="text-7xl font-black text-white tracking-tight">{gp.gatePassNumber}</h1>
                        </div>

                        {/* Vehicle Card */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6">
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase mb-2">Vehicle</p>
                                    <p className="text-white text-3xl font-black">{gp.vehicleNumber}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase mb-2">Driver</p>
                                    <p className="text-white text-2xl font-bold">{gp.driverName}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase mb-2">Gross Weight</p>
                                    <p className="text-white text-2xl font-bold">{gp.grossWeightKg ? `${gp.grossWeightKg} Kg` : '—'}</p>
                                </div>
                            </div>
                            {(gp.sealNumber || gp.containerNo) && (
                                <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/10">
                                    <div>
                                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Seal No.</p>
                                        <p className="text-white font-mono text-lg">{gp.sealNumber || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-xs font-bold uppercase mb-1">Container</p>
                                        <p className="text-white font-mono text-lg">{gp.containerNo || '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        {gp.items?.length > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <p className="text-white/40 text-xs font-bold uppercase mb-4">Cargo Items</p>
                                <div className="space-y-2">
                                    {gp.items.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Package size={14} className="text-white/30" />
                                                <span className="text-white font-medium">{item.description}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-white/60">{item.quantity} {item.uom}</span>
                                                {item.batchNo && (
                                                    <span className="font-mono text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded border border-primary-500/30">
                                                        {item.batchNo}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <p className="text-center text-white/20 text-xs mt-6">
                            {gp.approvedAt ? `Approved at ${format(new Date(gp.approvedAt), 'HH:mm:ss')}` : ''}
                            {lastUpdate ? ` · Last updated ${format(lastUpdate, 'HH:mm:ss')}` : ''}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
