/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Ruler, Info, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const INCH_TO_CM = 2.54;
const WIDTH_INCREMENT_CM = 10.5;

interface Dimension {
  w: number;
  h: number;
  d: number;
}

interface SizeData {
  id: string;
  label: string;
  dimensions: Dimension;
}

export default function App() {
  // --- State ---
  const [sizes, setSizes] = useState<string[]>(['XS', 'S', 'M', 'L']);
  const [baseSizeIndex, setBaseSizeIndex] = useState(2); // Default to 'M'
  const [baseDimensions, setBaseDimensions] = useState<Dimension>({ w: 72, h: 48, d: 48 });
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [costPrices, setCostPrices] = useState<Record<string, number>>({
    'XS': 10,
    'S': 12,
    'M': 15,
    'L': 18
  });

  const [showFeeDetails, setShowFeeDetails] = useState<string | null>(null);

  // --- Derived Data ---
  const calculatedSizes = useMemo(() => {
    const FEE_PERCENTAGES = {
      transaction: 0.0599,
      processing: 0.0476,
      regulatory: 0.0114,
      vatTransaction: 0.0060,
      vatProcessing: 0.0048,
      vatRegulatory: 0.0012,
    };
    const TOTAL_FEE_PERCENT = Object.values(FEE_PERCENTAGES).reduce((a, b) => a + b, 0);

    return sizes.map((label, index) => {
      const diff = index - baseSizeIndex;
      const width = baseDimensions.w + (diff * WIDTH_INCREMENT_CM);
      
      const ratio = width / baseDimensions.w;
      const height = baseDimensions.h * ratio;
      const depth = baseDimensions.d * ratio;
      
      const cost = costPrices[label] || 0;
      const shipping = (width * height * depth / 5000) * 20;
      const profit = cost * 1.4; // Target 140% profit on cost
      
      // Calculate selling price such that after fees, we keep (Cost + Shipping + Profit)
      // SellingPrice = (Cost + Shipping + Profit) / (1 - TOTAL_FEE_PERCENT)
      const sellingPrice = (cost + shipping + profit) / (1 - TOTAL_FEE_PERCENT);
      const totalFees = sellingPrice * TOTAL_FEE_PERCENT;

      const feeBreakdown = {
        transaction: sellingPrice * FEE_PERCENTAGES.transaction,
        processing: sellingPrice * FEE_PERCENTAGES.processing,
        regulatory: sellingPrice * FEE_PERCENTAGES.regulatory,
        vatTransaction: sellingPrice * FEE_PERCENTAGES.vatTransaction,
        vatProcessing: sellingPrice * FEE_PERCENTAGES.vatProcessing,
        vatRegulatory: sellingPrice * FEE_PERCENTAGES.vatRegulatory,
      };

      return {
        label,
        cm: { w: width, h: height, d: depth },
        inch: { 
          w: width / INCH_TO_CM, 
          h: height / INCH_TO_CM, 
          d: depth / INCH_TO_CM 
        },
        pricing: {
          cost,
          shipping,
          profit,
          totalFees,
          sellingPrice,
          feeBreakdown
        }
      };
    });
  }, [sizes, baseSizeIndex, baseDimensions, costPrices]);

  // --- Handlers ---
  const addSize = () => {
    if (newSizeLabel.trim()) {
      const label = newSizeLabel.trim().toUpperCase();
      setSizes([...sizes, label]);
      setCostPrices(prev => ({ ...prev, [label]: 0 }));
      setNewSizeLabel('');
    }
  };

  const updateCost = (label: string, value: string) => {
    const num = parseFloat(value) || 0;
    setCostPrices(prev => ({ ...prev, [label]: num }));
  };

  const removeSize = (index: number) => {
    if (sizes.length <= 1) return;
    const labelToRemove = sizes[index];
    const newSizes = sizes.filter((_, i) => i !== index);
    setSizes(newSizes);
    
    // Clean up cost prices
    const newCosts = { ...costPrices };
    delete newCosts[labelToRemove];
    setCostPrices(newCosts);

    if (baseSizeIndex >= newSizes.length) {
      setBaseSizeIndex(newSizes.length - 1);
    } else if (index < baseSizeIndex) {
      setBaseSizeIndex(baseSizeIndex - 1);
    }
  };

  const updateBaseDim = (key: keyof Dimension, value: string) => {
    const num = parseFloat(value) || 0;
    setBaseDimensions(prev => ({ ...prev, [key]: num }));
  };

  const moveSize = (index: number, direction: 'up' | 'down') => {
    const newSizes = [...sizes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sizes.length) return;
    
    // Swap
    [newSizes[index], newSizes[targetIndex]] = [newSizes[targetIndex], newSizes[index]];
    setSizes(newSizes);
    
    // Adjust base index if it was one of the swapped ones
    if (baseSizeIndex === index) setBaseSizeIndex(targetIndex);
    else if (baseSizeIndex === targetIndex) setBaseSizeIndex(index);
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans selection:bg-black selection:text-white p-6 md:p-12">
      <main className="max-w-7xl mx-auto space-y-12">
        
        {/* Top Row: Configuration (Simplified) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Base Dimensions Section */}
          <section className="bg-[#F8F9FA] rounded-3xl p-8 border border-[#EEEEEE]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                <Info className="w-5 h-5" />
                Base Reference
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              {(['w', 'h', 'd'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-black uppercase text-[#999999] mb-3 ml-1 tracking-widest">
                    {key === 'w' ? 'Width (W)' : key === 'h' ? 'Height (H)' : 'Depth (D)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={baseDimensions[key]}
                      onChange={(e) => updateBaseDim(key, e.target.value)}
                      className="w-full bg-white border border-[#E9ECEF] rounded-2xl px-4 py-5 font-mono text-2xl focus:outline-none focus:ring-4 focus:ring-black/5 transition-all text-center font-black"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#CCCCCC]">CM</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-[#E9ECEF]">
              <label className="block text-[11px] font-black uppercase text-[#999999] ml-1 tracking-widest">
                Pin Base Size
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setBaseSizeIndex(i)}
                    className={`px-6 py-3 rounded-2xl text-xs font-black transition-all border-2 ${
                      baseSizeIndex === i 
                        ? 'bg-black text-white border-black shadow-xl scale-105' 
                        : 'bg-white text-[#666666] border-[#E9ECEF] hover:border-[#CCCCCC]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#999999] italic mt-4 ml-1">
                Note: W=40cm thì mặc định là size M
              </p>
            </div>
          </section>

          {/* Size Inventory Section */}
          <section className="bg-[#F8F9FA] rounded-3xl p-8 border border-[#EEEEEE]">
            <h2 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-tight">
              <RefreshCw className="w-5 h-5" />
              Size Inventory
            </h2>

            <div className="grid grid-cols-1 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {sizes.map((label, i) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={i}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E9ECEF] group shadow-sm hover:border-black/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-[80px]">
                      <span className="font-black text-base truncate">{label}</span>
                      {baseSizeIndex === i && (
                        <span className="px-2 py-0.5 rounded-lg bg-black text-white text-[8px] font-black uppercase shrink-0 tracking-tighter">REF</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      <div className="flex flex-col items-end">
                        <label className="text-[8px] font-black uppercase text-[#CCCCCC] mb-1">Cost Price</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={costPrices[label] || 0}
                            onChange={(e) => updateCost(label, e.target.value)}
                            className="w-24 bg-[#F8F9FA] border border-[#EEEEEE] rounded-lg px-2 py-1.5 text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-black/10"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#CCCCCC] font-bold">$</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => removeSize(i)}
                        className="p-2 text-[#FF9999] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex gap-4 pt-6 border-t border-[#E9ECEF]">
              <input
                type="text"
                value={newSizeLabel}
                onChange={(e) => setNewSizeLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSize()}
                placeholder="Add Size (XL...)"
                className="flex-1 bg-white border border-[#E9ECEF] rounded-2xl px-6 py-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-black/5"
              />
              <button 
                onClick={addSize}
                className="bg-black text-white rounded-2xl px-10 py-5 font-black text-sm hover:bg-[#333333] transition-all flex items-center gap-2 active:scale-95 shadow-xl"
              >
                <Plus className="w-5 h-5" />
                ADD
              </button>
            </div>
          </section>
        </div>

        {/* Result Chart (Ultra Minimal - Zero Borders) */}
        <div className="w-full">
          <div className="bg-white flex flex-col p-0">
            <div className="w-full">
              <table className="w-full text-center border-collapse border border-[#EEEEEE]">
                <thead>
                  <tr className="bg-[#F8F9FA]">
                    <th className="py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-[#999999] text-left border border-[#EEEEEE]">Size</th>
                    <th className="py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-[#999999] border border-[#EEEEEE]">Width (W)</th>
                    <th className="py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-[#999999] border border-[#EEEEEE]">Height (H)</th>
                    <th className="py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-[#999999] border border-[#EEEEEE]">Depth (D)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedSizes.map((size, idx) => (
                    <tr key={idx} className="group hover:bg-[#F8F9FA]/50 transition-colors">
                      <td className="py-10 px-6 font-black text-4xl md:text-5xl tracking-tighter text-left leading-none uppercase border border-[#EEEEEE]">
                        {size.label}
                      </td>
                      <td className="py-10 px-6 border border-[#EEEEEE]">
                        <div className="text-3xl md:text-4xl font-black mb-2 leading-none">{Math.round(size.inch.w)}"</div>
                        <div className="text-[13px] font-normal text-[#444444] tracking-widest">{Math.round(size.cm.w)} cm</div>
                      </td>
                      <td className="py-10 px-6 border border-[#EEEEEE]">
                        <div className="text-3xl md:text-4xl font-black mb-2 leading-none">{Math.round(size.inch.h)}"</div>
                        <div className="text-[13px] font-normal text-[#444444] tracking-widest">{Math.round(size.cm.h)} cm</div>
                      </td>
                      <td className="py-10 px-6 border border-[#EEEEEE]">
                        <div className="text-3xl md:text-4xl font-black mb-2 leading-none">{Math.round(size.inch.d)}"</div>
                        <div className="text-[13px] font-normal text-[#444444] tracking-widest">{Math.round(size.cm.d)} cm</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-full pt-12">
          <div className="bg-[#F8F9FA] rounded-3xl p-8 border border-[#EEEEEE] relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                <RefreshCw className="w-5 h-5 text-[#666666]" />
                Price Matrix (Target 140% Profit)
              </h2>
            </div>
            
            {/* Centralized Tooltip */}
            <AnimatePresence>
              {showFeeDetails && (
                <>
                  <div 
                    className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[2px] rounded-3xl cursor-default" 
                    onClick={() => setShowFeeDetails(null)} 
                  />
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="w-full max-w-[280px] bg-[#111111] text-white p-6 rounded-[24px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] border border-white/10 pointer-events-auto"
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Fee Details: Size {showFeeDetails}</p>
                        <button 
                          onClick={() => setShowFeeDetails(null)}
                          className="p-1 hover:bg-white/10 rounded-full transition-colors group"
                        >
                          <RefreshCw className="w-3 h-3 text-[#444444] group-hover:text-white transition-colors" />
                        </button>
                      </div>

                      {(() => {
                        const size = calculatedSizes.find(s => s.label === showFeeDetails);
                        if (!size) return null;
                        const fees = [
                          { label: 'Transaction (5.99%)', val: size.pricing.feeBreakdown.transaction },
                          { label: 'Processing (4.76%)', val: size.pricing.feeBreakdown.processing },
                          { label: 'Regulatory (1.14%)', val: size.pricing.feeBreakdown.regulatory },
                          { label: 'VAT Trans (0.60%)', val: size.pricing.feeBreakdown.vatTransaction },
                          { label: 'VAT Proc (0.48%)', val: size.pricing.feeBreakdown.vatProcessing },
                          { label: 'VAT Reg (0.12%)', val: size.pricing.feeBreakdown.vatRegulatory },
                        ];
                        return (
                          <div className="space-y-2.5">
                            {fees.map((f, i) => (
                              <div key={i} className="flex justify-between items-center text-[11px] group/item">
                                <span className="text-[#888888] font-medium">{f.label}</span>
                                <span className="font-mono text-white group-hover/item:text-green-400 transition-colors tracking-tighter">
                                  ${f.val.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-separate border-spacing-0 bg-white rounded-2xl shadow-sm">
                <thead>
                  <tr className="bg-[#F1F3F5]">
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEEEEE] rounded-tl-2xl">Size</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEEEEE]">Cost ($)</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEEEEE]">Shipping</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEEEEE]">Profit (140%)</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#666666] border-b border-[#EEEEEE]">Fees & Taxes</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-black border-b border-[#EEEEEE] bg-black/5 rounded-tr-2xl">Selling Price ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {calculatedSizes.map((size, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors group">
                      <td className={`py-5 px-6 font-bold text-sm ${idx === calculatedSizes.length - 1 ? "rounded-bl-2xl" : ""}`}>{size.label}</td>
                      <td className="py-5 px-6 text-sm text-[#333333] font-medium">
                        ${size.pricing.cost.toFixed(2)}
                      </td>
                      <td className="py-5 px-6 text-sm font-mono text-[#999999]">
                        ${size.pricing.shipping.toFixed(2)}
                      </td>
                      <td className="py-5 px-6 text-sm font-bold text-green-600">
                        +${size.pricing.profit.toFixed(2)}
                      </td>
                      <td className="py-5 px-6 text-sm text-[#999999]">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-mono">+${size.pricing.totalFees.toFixed(2)}</span>
                          <button 
                            onClick={() => setShowFeeDetails(size.label)}
                            className="p-1.5 bg-black/5 hover:bg-black text-black hover:text-white rounded-lg transition-all"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className={`py-5 px-6 font-black text-base text-black bg-black/5 ${idx === calculatedSizes.length - 1 ? "rounded-br-2xl" : ""}`}>
                        ${size.pricing.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#999999] uppercase tracking-widest px-2">
                <Info className="w-3 h-3" />
                Logic: Price = (Cost + Shipping + Profit) / (1 - 13.09%)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#999999] uppercase tracking-widest px-2">
                <Info className="w-3 h-3" />
                Profit target: 140% of Cost Price
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
